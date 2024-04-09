from django.shortcuts import render
from agora_token_builder import RtcTokenBuilder
from django.http import JsonResponse
from .models import RoomMember
import random
import time
import json

from django.views.decorators.csrf import csrf_exempt
# Create your views here.

def getToken(request):
    appId = '91adcbed0db9435fb5eaa4d1ce123e47'
    appCertificate = 'ee9bff53c95e416a8af226665b92ff17'
    channelName = request.GET.get('channel')
    uid = random.randint(1,230)
    expirationTimeInSeconds = 3600 * 24
    currentTimeStamp = time.time()
    role = 1
    privilegeExpiredTs = currentTimeStamp + expirationTimeInSeconds
    print((appId, appCertificate, channelName, uid, role, privilegeExpiredTs))
    token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs)
    return JsonResponse({'token':token,'uid':uid}, safe=False)
def lobby(request):
    return render(request,'basics\\lobby.html')

def room(request):
    return render(request,'basics\\room.html')

@csrf_exempt
def createMember(request):
    data = json.loads(request.body)
    member,created = RoomMember.objects.get_or_create(
        name = data['name'],
        uid = data['UID'],
        room_name = data['room_name']
    )
    return JsonResponse({'name':data['name']},safe=False)
    
def getMember(request):
    uid = request.GET.get('uid')
    room_name = request.GET.get('room_name')
    member = RoomMember.objects.get(
        uid=uid,
        room_name=room_name,
    )
    name = member.name
    return JsonResponse({'name':name},safe=False)

@csrf_exempt
def deleteMember(request):
    data = json.loads(request.body)
    member = RoomMember.objects.get(
        uid = data['UID'],
        name = data['name'],
        room_name=data['room_name'],
    )
    
    member.delete()
    return JsonResponse('Member Deleted',safe=False)