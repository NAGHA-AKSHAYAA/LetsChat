const APP_ID= '91adcbed0db9435fb5eaa4d1ce123e47'
const  CHANNEL = sessionStorage.getItem('room')
const TOKEN = sessionStorage.getItem('token')
const UID = sessionStorage.getItem('UID')
const NAME = sessionStorage.getItem('name')


const client = AgoraRTC.createClient({mode:'rtc',codec:'vp8'})

let localTracks = []
let remoteUsers = {}

let joinAndDisplayLocalStream = async () => {

    document.getElementById("room-name").innerText = CHANNEL

    client.on('user-published',handleuserJoined)
    client.on('user-left', handleUserRemoved)

    try{
        await client.join(APP_ID,CHANNEL,TOKEN,UID)
    }catch(error){
        console.error(error)
        window.open('/room','_self')
    }
    
    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks()

    let member = await createMember()

    let player = `<div class="video-container" id="user-container-${UID}">
    <div class="username-wrapper"><span class="user-name">${member.name}</span></div>
    <div class="video-player" id="user-${UID}"></div>
    </div>`

    document.getElementById('video-streams').insertAdjacentHTML('beforeend',player)

    //index = 0 - audio track, 1-videotrack
    localTracks[1].play(`user-${UID}`)

    await client.publish([localTracks[0],localTracks[1]])
}



let handleuserJoined = async(user, mediaType)=> {
    remoteUsers[user.uid] = user
    await client.subscribe(user, mediaType)
    if(mediaType === 'video'){
        let player = document.getElementById(`user-container=${user.uid}`)
        if(player!=null){
            player.remove()
        }
    
    let member = await getMember(user)

    player = `<div class="video-container" id="user-container-${user.uid}">
    <div class="username-wrapper"><span class="user-name">${member.name}</span></div>
    <div class="video-player" id="user-${user.uid}"></div>
    </div>`

    document.getElementById('video-streams').insertAdjacentHTML('beforeend',player)
    user.videoTrack.play(`user-${user.uid}`)
    }

    if(mediaType == 'audio'){
        user.audioTrack.play()
    }
}

let handleUserRemoved = async (user) => {
    delete remoteUsers[user.uid]
    document.getElementById(`user-container-${user.id}`).remove()
}

let leaveAndRemoveLocalStream = async () => {
    for(let i=0;localTracks.length>i;i++){
        localTracks[i].stop()
        localTracks[i].close()
    }

    await client.leave()
    deleteMember()
    window.open("/",'_self')
}

let toggleCamera = async(e) => {
    if(localTracks[1].muted){
        await localTracks[1].setMuted(false)
        e.target.style.backgroundColor = '#fff'
    }else{
        await localTracks[1].setMuted(true)
        e.target.style.backgroundColor = 'rgb(255,80,80,1)'
    }
}

let toggleMic = async(e) => {
    if(localTracks[0].muted){
        await localTracks[0].setMuted(false)
        e.target.style.backgroundColor = '#fff'
    }else{
        await localTracks[0].setMuted(true)
        e.target.style.backgroundColor = 'rgb(255,80,80,1)'
    }
}

let createMember = async() => {
    let response = await fetch('/create_member/',{
        method:'POST',
        headers:{
            'Content-Type': 'application/json'
        },
        body:JSON.stringify({'name':NAME, 'UID':UID, room_name:CHANNEL})
    })

    let member = await response.json()
    return member
}

let deleteMember = async() => {
    let response = await fetch('/delete_member/',{
        method:'POST',
        headers:{
            'Content-Type': 'application/json'
        },
        body:JSON.stringify({'name':NAME, 'UID':UID, room_name:CHANNEL})
    })
}

let getMember = async (user) => {
    let response = await fetch(`/get_member/?UID=${user.UID}&room_name=${CHANNEL}`)
    let member = await response.json()

    return member
}

let openChat = async(e) => {
    console.log(e.target.style.backgroundColor )
    if(e.target.style.backgroundColor === 'rgb(255, 255, 255)')
    {
        e.target.style.backgroundColor =  'rgb(255,80,80,1)'
        document.getElementById('chat-wrapper').style.display = "none"
        document.getElementById('video-wrapper').style.width = '100%'
    }
    else
    {
        e.target.style.backgroundColor = '#fff'
        document.getElementById('chat-wrapper').style.display = "block"
        document.getElementById('video-wrapper').style.width = '70%'
    }
}
function appendMessage(message) {
    var ul = document.getElementById("chat-box");
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(message));
    ul.appendChild(li);
}

let recognition;
let isRecording = false;
let trans_input = document.getElementById('transcription-text')
let displayText = document.getElementById('displaytext')
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = function(event) {
        const result = event.results[event.results.length - 1];
        const transcription = result[0].transcript;
        trans_input.value = transcription;
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
    };

    recognition.onend = function() {
        if (isRecording) {
            recognition.start();
        }
    };
    document.getElementById('record-btn').addEventListener('click',function()
    {
        if (!isRecording) {
            isRecording = true;
            recognition.start();
            document.getElementById('record-btn').style.backgroundColor =  '#fff'

            // Automatically stop recording after 90 seconds
            setTimeout(function() {
                isRecording = false;
                recognition.stop();
                document.getElementById('record-btn').style.backgroundColor = 'rgb(255,80,80,1)'
                
                // Process the transcribed text and send the message
                const message = trans_input.value;

                // Append the message to the display and store it in local storage
                appendMessage(message);
                
                // Clear the transcription area
                trans_input.value = '';
            }, 90000);
        } else {
            isRecording = false;
            recognition.stop();
            document.getElementById('record-btn').style.backgroundColor = 'rgb(255,80,80,1)'
        }
    });

    document.getElementById('send-btn').addEventListener('click',function() {
        // Process the transcribed text and send the message
        const message = trans_input.value;
        console.log(message)
        appendMessage(message);

        // Clear the transcription area
        trans_input.value = '';
    });
}

document.getElementById('leave-btn').addEventListener('click',leaveAndRemoveLocalStream)
document.getElementById('camera-btn').addEventListener('click',toggleCamera)
document.getElementById('mic-btn').addEventListener('click',toggleMic)
document.getElementById('chat-btn').addEventListener('click',openChat)
window.addEventListener('beforeunload',deleteMember)

joinAndDisplayLocalStream()