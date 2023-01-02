import { ISetting, SettingType} from '@rocket.chat/apps-engine/definition/settings';

export enum AppSetting {
    OutputChannel = 'reporter_outputchannel',
    NotifyAll = 'reporter_notify_all',
    NotifyHere = 'reporter_notify_here',
}

export const settings: Array<ISetting> = [
    {
        id: AppSetting.OutputChannel,
        public: true,
        type: SettingType.STRING,
        value: "general",
        packageValue: "general",
        hidden: false,
        i18nLabel: 'Reporter_OutputChannel',
        i18nDescription: 'Reporter_OutputChannel_Desc',
        required: true,
    },
    {
        id: AppSetting.NotifyAll,
        public: true,
        type: SettingType.BOOLEAN,
        value: true,
        packageValue: "true",
        hidden: false,
        i18nLabel: 'Reporter_Notify_All',
        i18nDescription: 'Reporter_Notify_All_Desc',
        required: false,
    },
    {
        id: AppSetting.NotifyHere,
        public: true,
        type: SettingType.BOOLEAN,
        value: true,
        packageValue: true,
        hidden: false,
        i18nLabel: 'Reporter_Notify_Here',
        i18nDescription: 'Reporter_Notify_Here_Desc',
        required: false,
    },     
]