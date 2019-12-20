'use strict'

const alexa = require('ask-sdk');
const entities = require('html-entities').AllHtmlEntities;
// const request = require('request');
const striptags = require('striptags');
const constants = require('./constants');
const feedparser = require('feedparser-promised');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    async handle(handlerInput) {
        const playbackInfo = await getPlaybackInfo(handlerInput);
        let audioData = await fetchFeed();

        let title;
        let content;
        let message;
        let reprompt;

        if (!playbackInfo.hasPreviousPlaybackSession) {
            title = 'Welcome to the Christ Church Skill';
            content = 'Welcome to the Christ Church Skill. You can say play the latest sermon, list sermons, upcoming events, or main menu.';
            message = 'Welcome to the Christ Church Skill. You can say play the latest sermon, list sermons, upcoming events, or main menu.';
            reprompt = 'Would you like me to play the latest sermon?';
        } else {
            playbackInfo.inPlaybackSession = false;
            title = 'Welcome to the Christ Church Skill';
            content = `Welcome to the Christ Church Skill. You were listening to ${audioData[playbackInfo.playOrder[playbackInfo.index]].title}. Would you like to resume?`
            message = `You were listening to ${audioData[playbackInfo.playOrder[playbackInfo.index]].title}. Would you like to resume?`;
            reprompt = 'You can say yes to resume, no to play from the top, or main menu.';
        }

        return handlerInput.responseBuilder
            .withSimpleCard(title, content)
            .speak(message)
            .reprompt(reprompt)
            .getResponse();
    },
};

const MainMenuHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' && request.intent.name === 'MainMenuIntent';
    },
    async handle(handlerInput) {
        let title = 'Christ Church Main Menu';
        let content = 'Main Menu options are: Latest Sermons, Upcoming Events.';
        let message = 'Main Menu options are: Latest Sermons, Upcoming Events.';
        let reprompt = 'Again you can say, Latest Sermons, Upcoming Events.';

        const playbackInfo = await getPlaybackInfo(handlerInput);

        if (!playbackInfo.hasPreviousPlaybackSession) {
            playbackInfo.index = 0;
            playbackInfo.offsetInMilliseconds = 0;
            playbackInfo.playbackIndexChanged = true;
            playbackInfo.hasPreviousPlaybackSession = false;
        }
        return handlerInput.responseBuilder
            .withSimpleCard(title, content)
            .speak(message)
            .reprompt(reprompt)
            .getResponse();
    },
};

const UpcomingEventsHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' && request.intent.name === 'UpcomingEventsIntent';
    },
    async handle(handlerInput) {
        let title = 'Christ Church Upcoming Events';
        let content = 'Upcoming Events at Christ Church are, No upcoming events found.';
        let message = 'Upcoming Events at Christ Church are, No upcoming events found.';
        let reprompt = 'Again Upcoming Events at Christ Church are, No upcoming events found';

        return handlerInput.responseBuilder
            .withSimpleCard(title, content)
            .speak(message)
            .reprompt(reprompt)
            .getResponse();
    },
};

const LatestSermonHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' && request.intent.name === 'LatestSermonIntent';
    },
    async handle(handlerInput) {
        const playbackInfo = await getPlaybackInfo(handlerInput);
        let audioData = await fetchFeed();

        let title = 'Christ Church Latest Sermon';
        let content = `The latest sermon is ${audioData[playbackInfo.playOrder[playbackInfo.index]].title} by Christ Church given on ${audioData[playbackInfo.playOrder[playbackInfo.index]].date}, Would you like me to play it?`;
        let message = `The latest sermon is ${audioData[playbackInfo.playOrder[playbackInfo.index]].title} by Christ Church given on ${audioData[playbackInfo.playOrder[playbackInfo.index]].date}, Would you like me to play it?`;
        let reprompt = 'Would you like me to play the latest sermon?';
        return handlerInput.responseBuilder
            .withSimpleCard(title, content)
            .speak(message)
            .reprompt(reprompt)
            .getResponse();
    },
};

const PlaySermonByIndexHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' && request.intent.name === 'PlaySermonByIndexIntent';
    },
    async handle(handlerInput) {
        const playbackInfo = await getPlaybackInfo(handlerInput);

        let index = handlerInput.requestEnvelope.request.intent.slots.Index.value;

        playbackInfo.index = parseInt(index);
        playbackInfo.offsetInMilliseconds = 0;
        playbackInfo.playbackIndexChanged = true;
        playbackInfo.hasPreviousPlaybackSession = false;

        return controller.play(handlerInput);
    },
};

const ListSermonsHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' && request.intent.name === 'ListSermonsIntent';
    },
    async handle(handlerInput) {
        const playbackInfo = await getPlaybackInfo(handlerInput);
        let audioData = await fetchFeed();

        let itemSpeechList = sermonListHelper(audioData, playbackInfo.index);
        let itemCardList = sermonCardListHelper(audioData, playbackInfo.index);
        let title = 'Christ Church Sermon List';

        let message = `The last three sermons are  ${itemSpeechList}`;
        let content = `The last three sermons are: \n${itemCardList}`;
        let reprompt = 'Would you like me to play the latest sermon';

        return handlerInput.responseBuilder
            .withSimpleCard(title, content)
            .speak(message)
            .reprompt(reprompt)
            .getResponse();
    },
};

const AudioPlayerEventHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type.startsWith('AudioPlayer.');
    },
    async handle(handlerInput) {
        let audioData = await fetchFeed();
        const {
            requestEnvelope,
            attributesManager,
            responseBuilder
        } = handlerInput;
        const audioPlayerEventName = requestEnvelope.request.type.split('.')[1];
        const {
            playbackSetting,
            playbackInfo
        } = await attributesManager.getPersistentAttributes();

        switch (audioPlayerEventName) {
            case 'PlaybackStarted':
                playbackInfo.token = getToken(handlerInput);
                playbackInfo.index = await getIndex(handlerInput);
                playbackInfo.inPlaybackSession = true;
                playbackInfo.hasPreviousPlaybackSession = true;
                break;
            case 'PlaybackFinished':
                playbackInfo.inPlaybackSession = false;
                playbackInfo.hasPreviousPlaybackSession = false;
                playbackInfo.nextStreamEnqueued = false;
                break;
            case 'PlaybackStopped':
                playbackInfo.token = getToken(handlerInput);
                playbackInfo.index = await getIndex(handlerInput);
                playbackInfo.offsetInMilliseconds = getOffsetInMilliseconds(handlerInput);
                break;
            case 'PlaybackNearlyFinished':
            {
                if (playbackInfo.nextStreamEnqueued) {
                    break;
                }

                const enqueueIndex = (playbackInfo.index + 1) % audioData.length;

                if (enqueueIndex === 0 && !playbackSetting.loop) {
                    break;
                }

                playbackInfo.nextStreamEnqueued = true;

                const enqueueToken = playbackInfo.playOrder[enqueueIndex];
                const playBehavior = 'ENQUEUE';
                const podcast = audioData[playbackInfo.playOrder[enqueueIndex]];
                const expectedPreviousToken = playbackInfo.token;
                const offsetInMilliseconds = 0;

                responseBuilder.addAudioPlayerPlayDirective(
                    playBehavior,
                    podcast.url,
                    enqueueToken,
                    offsetInMilliseconds,
                    expectedPreviousToken,
                );
                break;
            }
            case 'PlaybackFailed':
                playbackInfo.inPlaybackSession = false;
                console.log('Playback Failed : %j', handlerInput.requestEnvelope.request.error);
                return;
            default:
                throw new Error('Should never reach here!');
        }

        return responseBuilder.getResponse();
    },
};

const CheckAudioInterfaceHandler = {
    async canHandle(handlerInput) {
        const audioPlayerInterface = ((((handlerInput.requestEnvelope.context || {}).System || {}).device || {}).supportedInterfaces || {}).AudioPlayer;
        return audioPlayerInterface === undefined
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('Sorry, this skill is not supported on this device')
            .withShouldEndSession(true)
            .getResponse();
    },
};

const StartPlaybackHandler = {
    async canHandle(handlerInput) {
        const playbackInfo = await getPlaybackInfo(handlerInput);
        const request = handlerInput.requestEnvelope.request;

        if (!playbackInfo.inPlaybackSession) {
            return request.type === 'IntentRequest' && request.intent.name === 'PlayLatestSermonIntent';
        }
        if (request.type === 'PlaybackController.PlayCommandIssued') {
            return true;
        }

        if (request.type === 'IntentRequest') {
            return request.intent.name === 'PlayLatestSermonIntent' ||
                request.intent.name === 'AMAZON.ResumeIntent';
        }
    },
    handle(handlerInput) {
        return controller.play(handlerInput);
    },
};

const NextPlaybackHandler = {
    async canHandle(handlerInput) {
        const playbackInfo = await getPlaybackInfo(handlerInput);
        const request = handlerInput.requestEnvelope.request;

        return playbackInfo.inPlaybackSession &&
            (request.type === 'PlaybackController.NextCommandIssued' ||
                (request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NextIntent'));
    },
    handle(handlerInput) {
        return controller.playNext(handlerInput);
    },
};

const PreviousPlaybackHandler = {
    async canHandle(handlerInput) {
        const playbackInfo = await getPlaybackInfo(handlerInput);
        const request = handlerInput.requestEnvelope.request;

        return playbackInfo.inPlaybackSession &&
            (request.type === 'PlaybackController.PreviousCommandIssued' ||
                (request.type === 'IntentRequest' && request.intent.name === 'AMAZON.PreviousIntent'));
    },
    handle(handlerInput) {
        return controller.playPrevious(handlerInput);
    },
};

const PausePlaybackHandler = {
    async canHandle(handlerInput) {
        const playbackInfo = await getPlaybackInfo(handlerInput);
        const request = handlerInput.requestEnvelope.request;

        return playbackInfo.inPlaybackSession &&
            request.type === 'IntentRequest' &&
            (request.intent.name === 'AMAZON.StopIntent' ||
                request.intent.name === 'AMAZON.CancelIntent' ||
                request.intent.name === 'AMAZON.PauseIntent');
    },
    handle(handlerInput) {
        return controller.stop(handlerInput);
    },
};

const StartOverHandler = {
    async canHandle(handlerInput) {
        const playbackInfo = await getPlaybackInfo(handlerInput);
        const request = handlerInput.requestEnvelope.request;

        return playbackInfo.inPlaybackSession &&
            request.type === 'IntentRequest' &&
            request.intent.name === 'AMAZON.StartOverIntent';
    },
    async handle(handlerInput) {
        const playbackInfo = await getPlaybackInfo(handlerInput);

        playbackInfo.offsetInMilliseconds = 0;

        return controller.play(handlerInput);
    },
};

const HelpHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    async handle(handlerInput) {
        let audioData = await fetchFeed();
        const playbackInfo = await getPlaybackInfo(handlerInput);
        let message;

        if (!playbackInfo.hasPreviousPlaybackSession) {
            message = 'Welcome to the Christ Church skill. You can say, play the audio to begin the sermon.';
        } else if (!playbackInfo.inPlaybackSession) {
            message = `You were listening to ${audioData[playbackInfo.index].title}. Would you like to resume?`;
        } else {
            message = 'You are listening to the Christ Church sermons. You can say, Next or Previous to navigate through the playlist. At any time, you can say Pause to pause the audio and Resume to resume.';
        }

        return handlerInput.responseBuilder
            .speak(message)
            .reprompt(message)
            .getResponse();
    },
};

const YesHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.YesIntent';
    },
    handle(handlerInput) {
        return controller.play(handlerInput);
    },
};

const NoHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NoIntent';
    },
    async handle(handlerInput) {
        const playbackInfo = await getPlaybackInfo(handlerInput);

        playbackInfo.index = 0;
        playbackInfo.offsetInMilliseconds = 0;
        playbackInfo.playbackIndexChanged = true;
        playbackInfo.hasPreviousPlaybackSession = false;

        return controller.play(handlerInput);
    },
};

const ExitHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;


        return request.type === 'IntentRequest' &&
            (request.intent.name === 'AMAZON.StopIntent' ||
                request.intent.name === 'AMAZON.CancelIntent');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('Thanks for making Christ Famous in the Quad Cities. Goodbye!')
            .getResponse();
    },
};

const SystemExceptionHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'System.ExceptionEncountered';
    },
    handle(handlerInput) {
        console.log(`System exception encountered: ${handlerInput.requestEnvelope.request.reason}`);
    },
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

        return handlerInput.responseBuilder.getResponse();
    },
};

/* INTERCEPTORS */

const LoadPersistentAttributesRequestInterceptor = {
    async process(handlerInput) {
        const persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes();
        // let audioData = await fetchFeed();

        // Check if user is invoking the skill the first time and initialize preset values
        if (Object.keys(persistentAttributes).length === 0) {
            handlerInput.attributesManager.setPersistentAttributes({
                playbackSetting: {
                    loop: false,
                    shuffle: false,
                },
                playbackInfo: {
                    playOrder: [...Array(audioData.length).keys()],
                    index: 0,
                    offsetInMilliseconds: 0,
                    playbackIndexChanged: true,
                    token: '',
                    nextStreamEnqueued: false,
                    inPlaybackSession: false,
                    hasPreviousPlaybackSession: false,
                },
            });
        }
    },
};

const SavePersistentAttributesResponseInterceptor = {
    async process(handlerInput) {
        await handlerInput.attributesManager.savePersistentAttributes();
    },
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);
        const message = 'Sorry, this is not a valid command. Please say help to hear what you can say.';

        return handlerInput.responseBuilder
            .speak(message)
            .reprompt(message)
            .getResponse();
    },
};

const skillBuilder = alexa.SkillBuilders.standard();

exports.handler = skillBuilder
    .addRequestHandlers(
        LaunchRequestHandler,
        MainMenuHandler,
        UpcomingEventsHandler,
        ListSermonsHandler,
        LatestSermonHandler,
        PlaySermonByIndexHandler,
        CheckAudioInterfaceHandler,
        StartPlaybackHandler,
        NextPlaybackHandler,
        PreviousPlaybackHandler,
        PausePlaybackHandler,
        StartOverHandler,
        AudioPlayerEventHandler,
        HelpHandler,
        YesHandler,
        NoHandler,
        ExitHandler,
        SystemExceptionHandler,
        SessionEndedRequestHandler
    )
    .addRequestInterceptors(LoadPersistentAttributesRequestInterceptor)
    .addResponseInterceptors(SavePersistentAttributesResponseInterceptor)
    .addErrorHandlers(ErrorHandler)
    .withAutoCreateTable(true)
    .withTableName(constants.skill.dynamoDBTableName)
    .lambda();

const controller = {
    async play(handlerInput) {
        let audioData = await fetchFeed();
        const {
            attributesManager,
            responseBuilder
        } = handlerInput;

        const playbackInfo = await getPlaybackInfo(handlerInput);
        const {
            playOrder,
            offsetInMilliseconds,
            index
        } = playbackInfo;

        const playBehavior = 'REPLACE_ALL';
        const podcast = audioData[playOrder[index]];
        const token = playOrder[index];
        playbackInfo.nextStreamEnqueued = false;

        responseBuilder
            .speak(`This is ${podcast.title}`)
            .withShouldEndSession(true)
            .addAudioPlayerPlayDirective(playBehavior, podcast.url, token, offsetInMilliseconds, null);

        if (await canThrowCard(handlerInput)) {
            const cardTitle = `Playing ${podcast.title}`;
            const cardContent = `Playing ${podcast.title}`;
            responseBuilder.withSimpleCard(cardTitle, cardContent);
        }

        return responseBuilder.getResponse();
    },
    stop(handlerInput) {
        return handlerInput.responseBuilder
            .addAudioPlayerStopDirective()
            .getResponse();
    },
    async playNext(handlerInput) {
        let audioData = await fetchFeed();
        const {
            playbackInfo,
            playbackSetting,
        } = await handlerInput.attributesManager.getPersistentAttributes();

        const nextIndex = (playbackInfo.index + 1) % audioData.length;

        if (nextIndex === 0 && !playbackSetting.loop) {
            return handlerInput.responseBuilder
                .speak('You have reached the end of the playlist')
                .addAudioPlayerStopDirective()
                .getResponse();
        }

        playbackInfo.index = nextIndex;
        playbackInfo.offsetInMilliseconds = 0;
        playbackInfo.playbackIndexChanged = true;

        return this.play(handlerInput);
    },
    async playPrevious(handlerInput) {
        let audioData = await fetchFeed();
        const {
            playbackInfo,
            playbackSetting,
        } = await handlerInput.attributesManager.getPersistentAttributes();

        let previousIndex = playbackInfo.index - 1;

        if (previousIndex === -1) {
            if (playbackSetting.loop) {
                previousIndex += audioData.length;
            } else {
                return handlerInput.responseBuilder
                    .speak('You have reached the start of the playlist')
                    .addAudioPlayerStopDirective()
                    .getResponse();
            }
        }

        playbackInfo.index = previousIndex;
        playbackInfo.offsetInMilliseconds = 0;
        playbackInfo.playbackIndexChanged = true;

        return this.play(handlerInput);
    },
};

/* HELPER FUNCTIONS */

async function getPlaybackInfo(handlerInput) {
    const attributes = await handlerInput.attributesManager.getPersistentAttributes();
    return attributes.playbackInfo;
}

async function canThrowCard(handlerInput) {
    const {
        requestEnvelope,
        attributesManager
    } = handlerInput;
    const playbackInfo = await getPlaybackInfo(handlerInput);

    if (requestEnvelope.request.type === 'IntentRequest' && playbackInfo.playbackIndexChanged) {
        playbackInfo.playbackIndexChanged = false;
        return true;
    }
    return false;
}

function getToken(handlerInput) {
    // Extracting token received in the request.
    return handlerInput.requestEnvelope.request.token;
}

async function getIndex(handlerInput) {
    // Extracting index from the token received in the request.
    const tokenValue = parseInt(handlerInput.requestEnvelope.request.token, 10);
    const attributes = await handlerInput.attributesManager.getPersistentAttributes();

    return attributes.playbackInfo.playOrder.indexOf(tokenValue);
}

function getOffsetInMilliseconds(handlerInput) {
    // Extracting offsetInMilliseconds received in the request.
    return handlerInput.requestEnvelope.request.offsetInMilliseconds;
}

function shuffleOrder() {
    let audioData = fetchFeed();
    const array = [...Array(audioData.length).keys()];
    let currentIndex = array.length;
    let temp;
    let randomIndex;
    // Algorithm : Fisher-Yates shuffle
    return new Promise((resolve) => {
        while (currentIndex >= 1) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            temp = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temp;
        }
        resolve(array);
    });
}

async function fetchFeed() {
    let itemList = [];

    await feedparser.parse(constants.sermonUrl).then(items => {
        let i = 1;
        items.forEach(item => {
            i = i + 1;
            let feedItem = {};
            if (item['title'] && item['date']) {
                feedItem['title'] = item['title'];
                feedItem['title'] = entities.decode(striptags(feedItem['title']));
                feedItem['title'] = feedItem['title'].trim();
                feedItem['title'] = feedItem['title'].replace(/[&]/g, 'and').replace(/[<>]/g, '');

                feedItem['date'] = new Date(item['date']).toDateString();

                if (item['description']) {
                    feedItem['description'] = item['description'];
                    feedItem['description'] = entities.decode(striptags(feedItem['description']));
                    feedItem['description'] = feedItem['description'].trim();
                    feedItem['description'] = feedItem['description'].replace(/[&]/g, 'and').replace(/[<>]/g, '').replace(/[“]/g, '').replace(/["]/g, '');
                }

                if (item['link']) {
                    feedItem['link'] = item['link'];
                }

                if (item['enclosures'][0].url) {
                    feedItem['url'] = item['enclosures'][0].url;
                    feedItem['url'] = feedItem['url'].replace('http', 'https');
                }

                if (item.image.url) {
                    feedItem['imageUrl'] = {};
                    feedItem.imageUrl['smallImageUrl'] = item.image.url.replace('http:', 'https:');
                    feedItem.imageUrl['largeImageUrl'] = item.image.url.replace('http:', 'https:');
                }

                // console.log('title: ', i, ' - ', feedItem.title, ' date: ', feedItem['date']);
                itemList.push(feedItem);

                let count = 0;

                itemList.sort(function (a, b) {
                    return new Date(b.date) - new Date(a.date);
                });

                itemList.forEach(function (feedItem) {
                    feedItem['count'] = count++;
                });

            }

        })
    });
    return itemList;
}

function sermonListHelper(items, listIndex) {
    let itemList = '';
    let index = 0;
    if (listIndex) {
        index = listIndex;
    }
    while (index < constants.sermonsPerPage) {
        itemList += (index + 1) + constants.breakTime['100'] + items[index].title + constants.breakTime['200'];
        index++;
    }
    itemList += ' Which one would you like to hear?';
    return itemList;
}

function sermonCardListHelper(items, listIndex) {
    let itemCardList = '';
    let index = 0;
    if (listIndex) {
        index = listIndex;
    }
    while (index < constants.sermonsPerPage) {
        itemCardList += (index + 1) + ') ' + items[index].title + ' \n';
        index++;
    }
    itemCardList += ' Which one would you like to hear?';
    return itemCardList;
}
