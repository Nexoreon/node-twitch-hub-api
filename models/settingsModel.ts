import { Schema, model } from 'mongoose';

export interface ISettings {
    _doc: object;
    enableFollowsCheck: boolean;
    enableGamesCheck: boolean;
    enableReportCreation: boolean;
    enableVodDataImport: boolean;
    notifications: {
        follows: {
            push: boolean;
            telegram: boolean;
        };
        games: {
            push: boolean;
            telegram: boolean;
        };
        reports: {
            push: boolean;
            telegram: boolean;
        };
        error: {
            push: boolean;
            telegram: boolean;
        };
    };
}

const settingsSchema: Schema<ISettings> = new Schema({
    enableFollowsCheck: {
        type: Boolean,
        default: true,
    },
    enableGamesCheck: {
        type: Boolean,
        default: true,
    },
    enableReportCreation: {
        type: Boolean,
        default: true,
    },
    enableVodDataImport: {
        type: Boolean,
        default: true,
    },
    notifications: {
        follows: {
            push: {
                type: Boolean,
                default: true,
            },
            telegram: {
                type: Boolean,
                default: false,
            },
        },
        games: {
            push: {
                type: Boolean,
                default: true,
            },
            telegram: {
                type: Boolean,
                default: false,
            },
        },
        reports: {
            push: {
                type: Boolean,
                default: true,
            },
            telegram: {
                type: Boolean,
                default: false,
            },
        },
        error: {
            push: {
                type: Boolean,
                default: false,
            },
            telegram: {
                type: Boolean,
                default: false,
            },
        },
    },
});

const Settings = model<ISettings>('th_settings', settingsSchema);

export default Settings;
