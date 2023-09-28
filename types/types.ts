export interface IResponseStreamer {
    id: string;
    login: string;
    display_name: string;
    user_id: string;
    user_login: string;
    user_name: string;
    game_id: string;
    game_name: string;
    title: string;
    profile_image_url: string;
    language: string;
    viewer_count: number;
    to_id: string;
    avatar: string;
}

export interface IResponseGame {
    id: string;
    name: string;
    box_art_url: string;
}

export interface IResponseVod {
    id: string;
    thumbnail_url: string;
    duration: string;
}

export interface IResponseToken {
    access_token: string;
    expires_in: number;
    token_type: string;
}

export interface IPushNotification {
    title?: string;
    message: string;
    link?: string;
    icon?: string;
    meta?: {
        game: string;
        streamer: string;
    };
}

export interface INotifyMethod {
    push?: boolean;
    telegram?: boolean;
}
