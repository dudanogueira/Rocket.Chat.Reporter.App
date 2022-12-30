import { IPersistence, IPersistenceRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageReportContext } from '@rocket.chat/apps-engine/definition/messages';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';

export class ReportPersistence {
    // add a record
    public static async report_message(persist: IPersistence, context: IMessageReportContext): Promise<boolean> {
        // no message to report
        if (!context.message.id){
            return false;
        }

        const associations: Array<RocketChatAssociationRecord> = [
            new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'message_report'),
            new RocketChatAssociationRecord(RocketChatAssociationModel.MESSAGE, context.message.id),
            new RocketChatAssociationRecord(RocketChatAssociationModel.USER, context.message.sender.id),
        ];

        try {
            let reason = context.reason
            let reporter_username = context.user.username
            let room = context.message.room.slugifiedName
            await persist.createWithAssociations({ reason, reporter_username, room }, associations);
        } catch (err) {
            console.warn(err);
            return false;
        }
        return true;
    }

    // query all records within the "scope" - message
    public static async findReportCountbyUser(persis: IPersistenceRead, context: IMessageReportContext, user): Promise<any> {
        const associations: Array<RocketChatAssociationRecord> = [
            new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'message_report'),
            new RocketChatAssociationRecord(RocketChatAssociationModel.USER, context.message.sender.id),
        ];
        let result: Array<string> = [];
        try {
            const records: Array<{ reason: string, reporter_username: string, room:string }> = (await persis.readByAssociations(associations)) as Array<{ reason: string, reporter_username: string, room:string }>;
            return records;
        } catch (err) {
            console.warn(err);
        }

        return result;
    }

}