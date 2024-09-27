const {
    util: {log},
    flux: {
        stores: {UserStore, MediaEngineStore},
        dispatcher
    },
    plugin: {store}
} = shelter;
store.fps ??= 30; // set default
store.resolution ??= 720; // set default
function onStreamQualityChange() {
    const mediaConnections = [...MediaEngineStore.getMediaEngine().connections];
    const currentUserId = UserStore.getCurrentUser().id;
    const streamConnection = mediaConnections.find((connection) => connection.streamUserId === currentUserId);
    if (streamConnection) {
        streamConnection.videoStreamParameters[0].maxFrameRate = store.fps;
        streamConnection.videoStreamParameters[0].maxResolution.height = store.resolution;
        streamConnection.videoStreamParameters[0].maxResolution.width = store.resolution * (16 / 9);
        streamConnection.videoQualityManager.goliveMaxQuality.bitrateMin = 20000000;
        streamConnection.videoQualityManager.goliveMaxQuality.bitrateMax = 20000000;
        streamConnection.videoQualityManager.goliveMaxQuality.bitrateTarget = 20000000;
        log(`Patched current user stream with resolution: ${store.resolution} and fps: ${store.fps}`);
    }

    shelter.patcher.instead(
        "applyQualityConstraints",
        streamConnection,
        (args, originalFunction) => {
            let e = args[0];
            e.encodingVideoWidth = store.resolution;
            e.encodingVideoHeight = store.resolution * (16 / 9);
            e.encodingVideoFrameRate = store.fps;
            e.captureVideoFrameRate = store.fps;
            e.encodingVideoBitRate = 20000000;
            e.encodingVideoMinBitRate = 20000000;
            e.remoteSinkWantsFrameRate = store.fps;
            return {
                quality: {
                    bitrateMin: 20000000,
                    bitrateMax: 20000000,
                    bitrateTarget: 20000000,
                    encode: {
                        pixelCount: e.encodingVideoWidth * e.encodingVideoHeight,
                        framerate: e.encodingVideoFrameRate
                    }
                },
                constraints: e
            }
        }
    );

    shelter.patcher.instead(
        "pickProperties",
        streamConnection,
        (args, originalFunction) => {
            return {
                "remoteSinkWantsFrameRate": store.fps,
                "remoteSinkWantsPixelCount": store.resolution * (store.resolution * (16 / 9)),
                "encodingVideoMinBitRate": 20000000,
                "encodingVideoMaxBitRate": 20000000,
                "encodingVideoBitRate": 20000000,
                "encodingVideoWidth": store.resolution,
                "encodingVideoHeight": store.resolution * (16 / 9),
                "encodingVideoFrameRate": store.fps,
                "captureVideoFrameRate": store.fps,
                "streamParameters": args[0].streamParameters
            }
        }
    );
}
export function onLoad() {
    dispatcher.subscribe("MEDIA_ENGINE_VIDEO_SOURCE_QUALITY_CHANGED", onStreamQualityChange);
}

export function onUnload() {
    dispatcher.unsubscribe("MEDIA_ENGINE_VIDEO_SOURCE_QUALITY_CHANGED", onStreamQualityChange);
}
export {default as settings} from "./settings";
