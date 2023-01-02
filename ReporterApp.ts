import { URL } from "url";
import * as path from "path";
import {
  IAppAccessors,
  IConfigurationExtend,
  IEnvironmentRead,
  IHttp,
  ILogger,
  IMessageBuilder,
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
    // get logger
    var logger = this.getLogger();
    // get output channel
    const room_name_setting = await read
      .getEnvironmentReader()
      .getSettings()
      .getById(AppSetting.OutputChannel);
    // try to get configured output room
    const room = await read.getRoomReader().getByName(room_name_setting.value);
    if (room) {
      // lets persist this message report
      await ReportPersistence.report_message(persistence, context);
      // build message
      const messageStructure = await this.buildReportMessage(
        context,
        modify,
        read
      );
      // set room to report
      messageStructure.setRoom(room);
      // send the message
      modify
        .getCreator()
        .finish(messageStructure)
        .then((ok) => {
          // log success
          logger.success(
            `Message ${context.message.id} reported by user ${context.user.username} at #${context.message.room.slugifiedName} with reason: ${context.reason}`
          );
          // notify it was a success
          sendNotification(
            modify,
            context.message.room,
            context.user,
            "Thanks! The message was reported!"
          ).then();
        })
        .catch((error) => {
          // could not report.
          // this can happen as some channels may not allow @all or @here
          // we can then remove the @all and @here if that is the reason
          // and send the report again
          if (
            ["Notify_all_in_this_room", "Notify_active_in_this_room"].includes(
              error.details.action
            )
          ) {
            // warn at logs
            // TODO: this loggers is not working =\
            logger.warn(`Message reported, but could not notify @all or @here at channel ${room.slugifiedName}. Make sure it the App user is owner or moderator.`)
            // remove @all and @here
            var new_report_message = messageStructure
              .getText()
              .replace("@all", "all")
              .replace("@here", "here");
            messageStructure.setText(new_report_message);
            // try again to report, without @all and @here 
            modify
              .getCreator()
              .finish(messageStructure)
              .then((ok) => {
                // log success
                logger.success(
                  `Message ${context.message.id} reported by user ${context.user.username} at #${context.message.room.slugifiedName} with reason: ${context.reason}`
                );
                // notify it was a success
                sendNotification(
                  modify,
                  context.message.room,
                  context.user,
                  "Thanks! The message was reported!"
                ).then();
              });
          }
        });
    } else {
      // no room
      const output_channel_error =
        "Report Output room is not properly configured. Contact Admin";
      logger.error(output_channel_error);
      // get the room where it was reported
      const room = await read.getRoomReader().getById(context.message.room.id);
      // send a message to warn it
      if (room) {
        sendNotification(modify, room, context.user, output_channel_error);
      }
    }
  }

  public async buildReportMessage(
    context: IMessageReportContext,
    modify: IModify,
    read: IRead
  ): Promise<IMessageBuilder> {
    const messageStructure = modify.getCreator().startMessage();
    // get all reported content from this user
    const report_records = await ReportPersistence.findReportCountbyUser(
      read.getPersistenceReader(),
      context,
      context.message.sender.id
    );
    // const uniqueChannels = [...new Set(report_records.map(item => {
    //   if(item.room !== undefined){
    //     return `\`#${item.room}\``;
    //   }
    // }))].join(" ");
    var uniqueChannels = [
      ...new Set(
        report_records
          .filter((item) => item.room)
          .map((item) => `\`#${item.room}\``)
      ),
    ].join(" ");
    const user_report_count = report_records.length;
    // send context message to room
    if (context.message.room.type == "d") {
      var reported_room = "a DIRECT";
    } else {
      var reported_room = "channel #" + context.message.room.slugifiedName;
    }
    // main message
    var message = `*${context.message.sender.username}* was reported at ${reported_room} by user *${context.user.username}* \n*Reason:* \`${context.reason}\``;
    // add notifications
    const add_all = await read
      .getEnvironmentReader()
      .getSettings()
      .getById(AppSetting.NotifyAll);
    const add_here = await read
      .getEnvironmentReader()
      .getSettings()
      .getById(AppSetting.NotifyHere);
    var messages: Array<string>;
    messages = [];
    if (add_all.value == true) {
      messages.push("@all");
    }
    if (add_here.value == true) {
      messages.push("@here");
    }
    messages.push(message);
    const messages_text = messages.join(" ");
    messageStructure
      .setText(messages_text)
      .setUsernameAlias("MESSAGE REPORTED!");
    // define used urls
    const Site_Url = await read
      .getEnvironmentReader()
      .getServerSettings()
      .getValueById("Site_Url");
    // // define user urls
    const reported_user_avatar = new URL(
      path.join("avatar", context.message.sender.username),
      Site_Url
    ).href;
    const reported_user_edit = new URL(
      path.join("/admin/users/info/", context.message.sender.id),
      Site_Url
    ).href;
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
        },

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
    // try to reported the message
    return messageStructure;
  }
}
