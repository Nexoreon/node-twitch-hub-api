import PushNotifications from '@pusher/push-notifications-server';

const beamsClient = new PushNotifications({
    instanceId: process.env.PUSH_INSTANCE!,
    secretKey: process.env.PUSH_KEY!,
});

export default beamsClient;
