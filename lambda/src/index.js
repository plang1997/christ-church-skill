'use strict'

const alexa = require('ask-sdk');
const feedHelper = require('./feedHelper');
const htmlHelper = require('./htmlHelper');
const constants = require('./constants');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    async handle(handlerInput) {
        let title = 'Welcome to the Christ Church Skill';
        let content = 'Welcome to the Christ Church Skill. You can say play the latest sermon, list sermons, or main menu.'
        let message = 'Welcome to the Christ Church Skill. You can say play the latest sermon, list sermons, or main menu.';
        let reprompt = 'Would you like me to play the latest sermon?';

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
        let content = 'Main Menu options are: Latest Sermons.';
        let message = 'Main Menu options are: Latest Sermons.';
        let reprompt = 'Again you can say, Latest Sermons.';

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
        let title = 'Christ Church Latest Sermon';
        let content = 'The latest sermon is';
        let message = 'The latest sermon is';
        let reprompt = 'Again the latest sermon is';

        return handlerInput.responseBuilder
            .withSimpleCard(title, content)
            .speak(message)
            .reprompt(reprompt)
            .getResponse();
    },
};

const ListSermonsHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' && request.intent.name === 'ListSermonsIntent';
    },
    async handle(handlerInput) {
        // fetchFeed.call(this, (data, items) => {
        //     //this.attributes['items'] = items;
        //     // const itemsPerPage = 3;
        //     this.attributes['listIndex'] = 0;
        //     let itemList = sermonListHelper(items, this.attributes.listIndex);
        //     let itemCardList = sermonCardListHelper(items, this.attributes.listIndex);
        // });
            feedHelper.getFeed.call('fileName', (err, data, items) => {
                if (err) {
                    console.log('reportError');
                } else {
                    if (data) {
                        console.log(items);
                    } else {
                        console.log('Feed parsed is empty');
                    }
                }
            });
            let title = 'Christ Church Sermon List';
            let message = 'The last three sermons are ';// + itemList;
            let content = 'The last three sermons are: \n';// + itemCardList;
            let reprompt = 'Would you like me to play the latest sermon';

            return handlerInput.responseBuilder
                .withSimpleCard(title, content)
                .speak(message)
                .reprompt(reprompt)
                .getResponse();
        // });
    },
};

const YesHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.YesIntent';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('Goodbye!')
            .getResponse();
    },
};

const NoHandler = {
    async canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NoIntent';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('Goodbye!')
            .getResponse();
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
            .speak('Goodbye!')
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
        YesHandler,
        NoHandler,
        MainMenuHandler,
        UpcomingEventsHandler,
        ListSermonsHandler,
        LatestSermonHandler,
        SystemExceptionHandler,
        SessionEndedRequestHandler,
        ExitHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();

function fetchHTML(callback) {
    // const fileNameKey = 'fileName';
    // const versionIdKey = 'versionId';
    htmlHelper.getHTML(null, (err, html, data) => {
        if (err) {
            this.emit('reportError');
        } else {
            if (data) {
                this.attributes['htmlLength'] = html.length;
                this.attributes['outputLength'] = data.length;
                // Call new item notification to compute number of new items available
                callback(html, data);
            } else {
                console.log('HTML parsed is empty');
                this.emit('htmlEmptyError');
            }
        }
    });
}

function fetchFeed(callback) {
    const fileNameKey = 'fileName';
    // const versionIdKey = 'versionId';
    feedHelper.getFeed(this.attributes[fileNameKey], (err, data, items) => {
        if (err) {
            this.emit('reportError');
        } else {
            if (data) {
                this.attributes['feedLength'] = items.length;
                // Call new item notification to compute number of new items available
                callback(data, items);
            } else {
                console.log('Feed parsed is empty');
                this.emit('feedEmptyError');
            }
        }
    });
}

function sermonListHelper(items, listIndex) {
    let itemList = '';
    let index = 0;
    if (listIndex) {
        index = listIndex;
    }
    while (index < constants.sermonsPerPage) {
        itemList += (++index) + constants.breakTime['100'] + items[index].title + constants.breakTime['200'];
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
        itemCardList += (++index) + ') ' + items[index].title + ' \n';
    }
    itemCardList += ' Which one would you like to hear?';
    return itemCardList;
}
