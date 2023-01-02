import {
  IAppAccessors,
  IConfigurationExtend,
  IEnvironmentRead,
  IHttp,
  ILogger,
  IModify,
  IPersistence,
  IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { App } from "@rocket.chat/apps-engine/definition/App";
import {
  IMessageReportContext,
  IPostMessageReported,
  MessageActionType,
  MessageActionButtonsAlignment,
} from "@rocket.chat/apps-engine/definition/messages";
import { IAppInfo } from "@rocket.chat/apps-engine/definition/metadata";
import { AppSetting, settings } from "./config/Settings";
import { ReportPersistence } from "./persistence/Report";
import { sendNotification } from "./lib/sendNotification";

import urlJoin from 'url-join';

export class MessageReporterApp extends App implements IPostMessageReported {
  constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
    super(info, logger, accessors);
  }

  public async extendConfiguration(
    configuration: IConfigurationExtend,
    environmentRead: IEnvironmentRead
  ): Promise<void> {
    await Promise.all(
      settings.map((setting) => configuration.settings.provideSetting(setting))
    );
  }

  public async executePostMessageReported(
    context: IMessageReportContext,
    read: IRead,
    http: IHttp,
    persistence: IPersistence,
    modify: IModify
  ): Promise<void> {
    const room_name_setting = await read
      .getEnvironmentReader()
      .getSettings()
      .getById(AppSetting.OutputChannel);
    // get configured room
    const room = await read.getRoomReader().getByName(room_name_setting.value);
    if (room) {
      // lets persis ths message report
      const reported = await ReportPersistence.report_message(
        persistence,
        context
      );
      // get all reported content from this user
      const report_records = await ReportPersistence.findReportCountbyUser(
        read.getPersistenceReader(),
        context,
        context.message.sender.id
      );
      const uniqueChannels = [...new Set(report_records.map(item => `\`#${item.room}\``))].join(" ");
      const user_report_count = report_records.length
      // send context message to room
      const messageStructure = modify.getCreator().startMessage();
      if(context.message.room.type == "d"){
        var reported_room = "a DIRECT"
      }else{
        var reported_room = "channel #" + context.message.room.slugifiedName
      }
      // main message
      let message = `*${context.message.sender.username}* was reported at ${reported_room} by user *${context.user.username}* \n*Reason:* \`${context.reason}\``;
      messageStructure
        .setRoom(room)
        .setText(message)
        .setUsernameAlias("MESSAGE REPORTED!");
      // define used urls
      const Site_Url = await read
        .getEnvironmentReader()
        .getServerSettings()
        .getValueById("Site_Url");
      // // define user urls
      const reported_user_avatar = urlJoin(Site_Url, "avatar", context.message.sender.username);
      const reported_user_edit = urlJoin(Site_Url, "/admin/users/info/", context.message.sender.id);
      // add attachment info
      messageStructure.addAttachment({
        title: {
          value: "Report information",
        },
        text: context.message.text,
        collapsed: true,
        author: {
          name: "@" + context.message.sender.username,
          icon: reported_user_avatar,
        },
        color: "red",
        fields: [
          {
            short: false,
            title: `Reports from this user so far:`,
            value: `\`${user_report_count} reports\` at channels ${uniqueChannels}`,
          },
          {
            short: true,
            title: "User Created at",
            value: context.message.sender.createdAt.toUTCString(),
          },
          {
            short: true,
            title: "Last Login",
            value: context.message.sender.lastLoginAt.toUTCString(),
          }

          // {
          //   short: true,
          //   title: "Channel",
          //   value: "#" + context.message.room.slugifiedName,
          // },
        ],
        actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
        actions: [
          {
            type: MessageActionType.BUTTON,
            text: "Edit user",
            url: reported_user_edit,
            msg: "text",
            is_webview: false,
          },
        ],
      });
      // // create action blocks
      // const block = modify.getCreator().getBlockBuilder();
      // block.addSectionBlock({
      //   text: block.newMarkdownTextObject(message),
      // });
      // block.addSectionBlock({
      //   text: block.newPlainTextObject("Select an action below 👇"),
      // });
      // var elements = [
      //   block.newButtonElement({
      //     actionId: "WarnUser",
      //     text: block.newPlainTextObject("Warn"),
      //     value: context.message.sender.username,
      //     style: ButtonStyle.PRIMARY,
      //   }),
      //   block.newButtonElement({
      //     actionId: "NukeUser",
      //     text: block.newPlainTextObject("Nuke"),
      //     value: context.message.sender.username,
      //     style: ButtonStyle.DANGER,
      //   }),
      // ];
      // block.addActionsBlock({
      //   blockId: "report_actions",
      //   elements: elements,
      // });
      // messageStructure.setBlocks(block);
      await modify.getCreator().finish(messageStructure); // sends the message in the room.

      // alert back to user that the message was reported
      await sendNotification(
        modify,
        context.message.room,
        context.user,
        "Thanks! Message was reported!"
      );
    } else {
      // no room
      // get the room where it was reported
      const room = await read.getRoomReader().getById(context.message.room.id);
      // send a message to warn it
      if (room) {
        sendNotification(
          modify,
          room,
          context.user,
          "Report room is not properly configured. Contact Admin"
        );
      }
    }
  }
}
