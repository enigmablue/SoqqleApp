import Company from "./schema/company";
import UserLogin, { LOGIN_LIST_SCHEMA, USER_LOGIN_SCHEMA } from "./schema/UserLogin";

const Realm = require('realm');
import Story, {STORY_SCHEMA} from './schema/story';
import Question, {QUESTION_SCHEMA} from './schema/question';
import Content, {CONTENT_SCHEMA} from './schema/content';
import Share, {SHARE_SCHEMA} from './schema/share';
import Preload, {PRELOAD_SCHEMA} from './schema/preLoad';
import TaskGroup, {TASK_GROUP_SCHEMA, TASK_GROUP_LIST_SCHEMA} from './schema/taskGroup';
import Team, {TEAM_SCHEMA} from './schema/team';
import Creator, {CREATOR_SCHEMA} from './schema/creator';
import Conversation, {CONVERSATION_SCHEMA} from './schema/conversation';
import UserProfile, {USER_PROFILE_SCHEMA} from './schema/userProfile';
import Reward, {REWARD_SCHEMA} from './schema/reward';
import Notification, {NOTIFICATION_SCHEMA} from './schema/notification';
import UserTaskGroup, {USER_TASK_GROUP_SCHEMA} from './schema/userTaskGroup';
import Task, {TASK_SCHEMA} from './schema/task';
import UserStory, {USERSTORY_SCHEMA} from './schema/userStory';
import Profile, {PROFILE_SCHEMA} from './schema/profile';
import Message, {MESSAGE_SCHEMA} from "./schema/message";
import Objective from "./schema/objective";
import Email from './schema/email';
import {Client} from 'bugsnag-react-native';
import {BUGSNAG_KEY, API_BASE_URL} from "../config";
const bugsnag = new Client(BUGSNAG_KEY);
import {mapGiftedChatToConversation, getuuid} from '../utils/common';
import {showMessage} from 'react-native-flash-message';
import * as axios from 'axios';
const instance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
  headers: { 'Content-type': 'application/json' }
});

const uuid = require('react-native-uuid');

const databaseOptions = {
    path: 'soqqle.realm',
    schema: [UserLogin,
      Company,
      Story,
      Question,
      Content,
      Share,
      TaskGroup,
      Team,
      Profile,
      UserProfile,
      UserTaskGroup,
      Objective,
      Message,
      Conversation,
      Email,
      Reward,
      UserStory,
      Task,
      Preload,
      Notification,
      Creator],
    deleteRealmIfMigrationNeeded: true,
    schemaVersion: 1
};

const realm = new Realm(databaseOptions);

export const saveWorld = (world, user) => {
    if (!world) {return};

    let groups = []
    let questions = []
    let stories = []
    let notifications = []

    if (world.stories && world.stories.lstStories) {
        stories = world.stories.lstStories;
    }
    if (world.groups && world.groups.recommendGroups) {
        groups = world.groups.recommendGroups;
    }
    if (world.questions && world.questions.listQuestion) {
        questions = world.questions.listQuestion;
    }
    if (world.notifications && world.notifications.notifications) {
        notifications = world.notifications.notifications;
    }
    realm.write(() => {
        stories.forEach((story) => {
            try {
              console.log("displayupdate story to be written ", story)
                story.environment=API_BASE_URL;
                realm.create(STORY_SCHEMA, story, Realm.UpdateMode.All)
            } catch (e) {
                bugsnag.notify(e);
                console.log("error1", e);
            }
        });
        questions.forEach((question) => {
            try {

                realm.create(QUESTION_SCHEMA, question, Realm.UpdateMode.All)
            } catch (e) {
                bugsnag.notify(e);
                console.log("error2", e);
            }
        });
        notifications.forEach((notification) => {
            try {
                realm.create(NOTIFICATION_SCHEMA, notification, Realm.UpdateMode.All)
            } catch (e) {
                bugsnag.notify(e);
                console.log("error2", e);
            }
        });

        groups.forEach((group) => {
            try {

                realm.create(USER_TASK_GROUP_SCHEMA, group, Realm.UpdateMode.All)
            } catch (e) {
                bugsnag.notify(e);
                console.log("error3", e);
            }
        });
    })

};

export const getStories = () => {
    return realm.objects(STORY_SCHEMA);
};

export const getQuestions = () => {
    return realm.objects(QUESTION_SCHEMA)
};

export const getQuestionsBySkill = (skill) => {
  let questions = realm.objects(QUESTION_SCHEMA);
  return questions.filtered("roadmapSkill == " + `'${skill}'`);

};
export const getMyProfile = () => {
    return realm.objects(USER_PROFILE_SCHEMA)
};
/*export const UpdateGroup = (Data) => {
    realm.write(() => {
        Data.forEach((group) => {
            try {
                realm.create(USER_TASK_GROUP_SCHEMA, group, true)
            }
            catch (e) {
                bugsnag.notify(e);
                console.log(e);
            }
        });
    })
}*/
export const createUserLogin = (user,date) => {
    try {
        let userLogin = {}
        if (user) {
            userLogin = {
                _id: user._id,
                lastlogin: date,
                sessionid: uuid.v1(),
                environment: API_BASE_URL
            }
        }

        realm.write(() => {
            realm.create(USER_LOGIN_SCHEMA, userLogin, Realm.UpdateMode.Never);
        })
    } catch (e) {
        bugsnag.notify(e);
        console.log("error4", e);
    }
}

/*export const UpdateUserTaskGroup = (Data) => {
    realm.write(() => {
        Data.forEach((group) => {
            try {
                realm.create(USER_TASK_GROUP_SCHEMA, group, true)
            }
            catch (e) {
                bugsnag.notify(e);
                console.log(e);
            }
        });
    })
}*/
export const updateTaskGroup = () => {
    return realm.objects(USER_TASK_GROUP_SCHEMA)
};

export const getUserTaskGroup = () => {
    return realm.objects(USER_TASK_GROUP_SCHEMA)
};

/*export const createUserStory = (story) =>
{
    realm.write(() => {
      try {
            return realm.create(USERSTORY_SCHEMA,
            {
              skill: story.skill,
              name: story.name,
              description: story.description,
              _objective: story._objective,
              _objectiveValue: story.objectiveValue,
              expiry: story.expiry,
              quota: story.quota,
              bonusSparks: story.bonusSparks,
              reducePerRefresh: story.reducePerRefresh,
              abstract: story.abstract,
              type: story.type,
              success: story.success,
              validation: story.validation,
              _company: story._company,
              taskGroup: story.taskGroup,
              nextteaser:  story.nextteaser,
              public: story.public,
              requirementValue: story.requirementValue,
              maxnum: story.maxnum,
              requirement: story.requirement,
              refresh: story.refresh,
              environment: story.environment
            },
            Realm.UpdateMode.All)
      } catch (e) {
          bugsnag.notify(e);
          console.log(e);
      }
  })
}

export const createTeam = (user) =>
{
  realm.write(() => {
    try {
        let teamUsers = [];
        teamUsers.push (user);
          return realm.create(TEAM_SCHEMA,
          {
            name: user.profile.firstName,
            users:  teamUsers,
            emails: { 'accepted': true, 'email': user.profile.email}
          },
          Realm.UpdateMode.All)
    } catch (e) {
        bugsnag.notify(e);
        console.log(e);
    }
  })
}*/

/*export const createGroup = (story, user) => {

  const newUserStory = createUserStory (story);
  const newTeam = createTeam (user);

  console.log("created user story", newUserStory );
  console.log("created user team", newTeam );


  realm.write(() => {
      try {
          return realm.create(USER_TASK_GROUP_SCHEMA,
            {
              _typeObject: story,
              userStory: newUserStory,
              team: newTeam,
            },
            Realm.UpdateMode.All)
      } catch (e) {
          bugsnag.notify(e);
          console.log(e);
      }
  })
}*/

export const deleteGroup = (groupId) => {
    realm.write(() => {
      try {
          let realmResult = realm.objects(USER_TASK_GROUP_SCHEMA).filtered("_id == " + `'${groupId}'`);
          if (realmResult){
            realm.delete(realmResult);
          }

      } catch (e) {
        bugsnag.notify(e)
        console.log(e);

      }
    })
  }


  export const createUpdateGroup = (group) => {
      realm.write(() => {
          group.leftBonusSparks=parseInt(group.leftBonusSparks);
          if (!group._userStory._feid){
            group._userStory._feid=getuuid();
          }

          if (!group.leftBonusSparks){
            group.leftBonusSparks=0;
          }

          let users = group._team.users;
          if (users){
            users.forEach((user) => {
            user.shares.forEach((share)=>{
            let shareContent=share.content;
              if (!shareContent._feid){
                  shareContent._feid=getuuid();
                }
             });
           });
          }

          try {
              realm.create(USER_TASK_GROUP_SCHEMA, group, Realm.UpdateMode.All)
          } catch (e) {
              bugsnag.notify(e);
              console.log(e);
          }
      })
  }

export const createUpdateUserStory = (userStory) => {
    realm.write(() => {
        try {
            realm.create(USERSTORY_SCHEMA, userStory, Realm.UpdateMode.All)
        } catch (e) {
            bugsnag.notify(e);
            console.log(e);
        }
    })
}

export const createUpdateQuestions = (questions) => {
  realm.write(() => {
      try {
          questions.forEach(question=>{
            realm.create(QUESTION_SCHEMA, question, Realm.UpdateMode.All)
          })
      } catch (e) {
          bugsnag.notify(e);
          console.log(e);
      }
  })
}

export const createUpdateContent = (content) => {
  realm.write(() => {
      try {

          realm.create(CONTENT_SCHEMA, content, Realm.UpdateMode.All)
      } catch (e) {
          bugsnag.notify(e);
          console.log(e);
      }
  })
}

export const createUpdateShare = (share) => {
  realm.write(() => {
      try {
          realm.create(SHARE_SCHEMA, share, Realm.UpdateMode.All)
      } catch (e) {
          bugsnag.notify(e);
          console.log(e);
      }
  })
}

export const addCommentToShare = (share, content1, type, uuid) => {
    realm.write(() => {
        try {

          const content= realm.create(CONTENT_SCHEMA, {
               //setup attribute for conversation to save
               _feid: uuid,
               content1: content1,
               type: type,
           }, true);

           share.comments.push(content);


        } catch (e) {
            bugsnag.notify(e);
            console.log(e);
        }
    })
}

export const setShareExport = async (share,status) => {
    realm.write(() => {
        try {
            share.submit=status;
            return share;
        } catch (e) {
            bugsnag.notify(e);
            console.log(e);
        }
    })
}

export const createTask = () => {

    let generateduuid= getuuid();
    let task;
    try {
      realm.write(() => {
        task = realm.create(TASK_SCHEMA, {_taskId: generateduuid, content: []});

      });
    } catch (e) {
      console.log("Error on creation", e);
    }
    return task;
}

export const addManualMessage =(group, generateduuid, sender, receiver, type, user, time,  ref, message) => {

  let combinedMsg=group._team.conversation.messages;
  realm.write(() => {

    let firstMsg=group._team.conversation.messages[0];
    let convoId;
    if (firstMsg) { convoId=firstMsg.conversationId; }

     const newMessage= realm.create(MESSAGE_SCHEMA, {
          //setup attribute for conversation to save
          msgId : generateduuid,
          time: time,
          message: message,
          sender:sender,
          conversationId: convoId,
          type: type,
          groupId: group._id,
          refId: ref,
          userProfile: user,
          image: message.image,
      }, true);
    combinedMsg.push(newMessage);

          try {
              realm.create('UserTaskGroup', {
                id: group._id,
                messages: combinedMsg,
            }, true)
          }
          catch (e) {
              bugsnag.notify(e)
              console.log(e);
          }
      })
}

export const addMessage =(group, user, message,generateduuid) => {
  realm.write(() => {

    let combinedMsg=group._team.conversation.messages;
    let convoid=group._team.conversation._id;


    if (!combinedMsg){
       combinedMsg = []
     }
    let msgTime = message.time;

    if (!msgTime) { msgTime=new Date().toISOString()}

     const newMessage= realm.create(MESSAGE_SCHEMA, {
          //setup attribute for conversation to save
          msgId : generateduuid,
          time: msgTime,
          message: message.text,
          sender:message.sender,
          receiver: message.receiver,
          conversationId: convoid,
          type: message.type,
          image: message.image,
      }, true);

      combinedMsg.push(newMessage);

          try {
              realm.create('Conversation', {
                _id: convoid,
                messages: combinedMsg,
            }, true)
          }
          catch (e) {
              bugsnag.notify(e)
              console.log(e);
          }
      })
}

export const addNewMessage =(group,content,sender, receiver, type, generateduuid, image ) => {
    return new Promise((resolve, reject) => {
        try {
            console.log("adding new message ",content)
            if (!group){
                bugsnag.notify("Group is undefined REALMHELPER: addNewMessage ")
                return;
            }

            let combinedMsg=group._team.conversation.messages;

            realm.write(() => {

                let convoId = group._team.conversation._id;
            /*    if (combinedMsg){
                if (group.messages[0]) {
                    convoId=group._team.conversation.messages[0].conversationId;
                }
                }
            */
                console.log("creating message with convoid ", convoId);

                let msgTime = new Date().toISOString();

                const newMessage= realm.create(MESSAGE_SCHEMA, {
                    //setup attribute for conversation to save
                    msgId : generateduuid,
                    time: msgTime,
                    message: content,
                    sender:sender,
                    conversationId: convoId,
                    receiver: receiver,
                    type: type,
                }, true);

                if (image){
                    newMessage.image=image;
                }

                console.log("added message ", newMessage)
                combinedMsg.push(newMessage);

                realm.create('UserTaskGroup', {
                    id: group._id,
                    messages: combinedMsg,
                }, true)
                console.log('WWW-add message-finished')
                resolve();
            })
        } catch (error) {
            reject(error);
        }
    })
}

export const getUserLastLoginInfo = (userID) => {
    return realm.objects(USER_LOGIN_SCHEMA).sorted('lastlogin',true)[0] || {}
}

export const getGroup = (id) => {
      try {
          let realmResult = realm.objects(USER_TASK_GROUP_SCHEMA).filtered("_id == " + `'${id}'`);
          return realmResult;
      } catch (e) {
        bugsnag.notify(e)
          console.log("error -> GetGroups", e)
      }
  }

  export const getSharesById = (idsArray) => {
      /**
       * @param  {strings[]} idsArray
       */

       if (!idsArray || idsArray.length < 1){
          return;
        }


      try {
          let realmResult = realm.objects(SHARE_SCHEMA).filtered(idsArray
              .map((_id) => "_id == " + `'${_id}'`).join(' OR '));
          return realmResult;
      } catch (e) {
        bugsnag.notify(e)
          console.log("error -> getSharesById", e)
      }
  }


  export const setUserStory =(group, story) =>{
  try {
    realm.write(() => {
      let generateduuid=getuuid();

                  const newStory = realm.create(USERSTORY_SCHEMA, {
                     //setup attribute for conversation to save
                     _feid: generateduuid,
                     skill : story.skill,
                     name: story.name,
                     description: story.description,
                     _objective:story._objective,
                     objectiveValue: story.objectiveValue,
                     expiry: story.expiry,
                     quota: story.quota,
                     bonusSparks: story.bonusSparks,
                     reducePerRefresh: story.reducePerRefresh,
                     abstract: story.abstract,
                     type:story.type,
                     success:story.success,
                     validation: story.validation,
                     _company: story._company,
                     taskGroup: story.taskGroup,
                     nextTeaser: story.nextTeaser,
                     public:  story.public,
                     requirementValue: story.requirementValue,
                     maxnum: story.maxnum,
                     requirement: story.requirement,
                    refresh: story.refresh,
                    environment: story.environment,
                    reward: story.reward,
                 }, true);

                 group._userStory=newStory;
                const data = {
                    "newUserStory": group._userStory,
                    "_id": group._id,
                }

                instance.post(`${API_BASE_URL}/saveTaskGroup`, data).then(response => {
                        if (response) {
                          createUpdateUserStory(response.data._userStory); //update the id returned from the server
                          return response.data;
                        }
                    }).catch(err => {
                    console.log('BrainDump Err ', err);
                    bugsnag.notify(err);
                  });
            });
          } catch (e) {
              bugsnag.notify(e)
              console.log(e);
        }
        return group;
}

export const addTaskToGroup = async (task, groupId) => {
    let group = await getGroup(groupId)[0];
    await realm.write(() => {
        try {
          if (!group.tasks){ group.tasks=[]; }
          group.tasks.push(task);


        } catch (e) {
            bugsnag.notify(e);
            console.log(e);
        }
    })
    return group;
}

export const getNotifications = () => {
    return realm.objects(NOTIFICATION_SCHEMA).sorted('sent',true)
}
