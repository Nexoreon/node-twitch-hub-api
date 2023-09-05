import { Types, Schema, model } from 'mongoose';

export interface INotification {
    createdAt: Date;
    sendOut: Date;
    title: string;
    content: string;
    image: string;
    link: string;
    receivers: Types.ObjectId[];
    readBy: Types.ObjectId[];
    hiddenFor: Types.ObjectId[];
}

const notificationSchema: Schema<INotification> = new Schema({
    createdAt: {
        type: Date,
        default: Date.now,
    },
    sendOut: {
        type: Date,
        required: [true, 'Необходимо указать дату отправки уведомления'],
    },
    title: {
        type: String,
        required: [true, 'Необходимо указать заголовок уведомления'],
    },
    content: {
        type: String,
        required: [true, 'Необходимо указать содержимое уведомления'],
    },
    image: String,
    link: String,
    receivers: [Schema.Types.ObjectId],
    readBy: [Schema.Types.ObjectId],
    hiddenFor: [Schema.Types.ObjectId],
});

const Notification = model<INotification>('th-notifications', notificationSchema);

export default Notification;
