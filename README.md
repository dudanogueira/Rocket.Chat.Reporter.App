# Reporter
Analyze and Manage Reported Users and Messages

## Getting Started
- Install this app at your Rocket.Chat workspace
- Configure the channel where reported messages should go. On the below examples, we configured to `report-abuse`

## How it Works
When someone reports a message, it will get into the configured channel:

![image](https://user-images.githubusercontent.com/1761174/210116945-10ea75da-e65b-4ac9-a972-02af67fc72d2.png)

The user can then provide a **reason**:

![image](https://user-images.githubusercontent.com/1761174/210117519-e81f6687-f65b-46b6-8023-4359d7f9283c.png)

Admins can analyze and take action at the user of the reported message, if necessary:

![image](https://user-images.githubusercontent.com/1761174/210117477-d931759f-34c4-4ece-9156-d3dca86b0a53.png)


# ROADMAP
- Allow warnings. Configured roles can register a warning to the reported user, that will be stored an displayed on future reportings.
- Allow Nuke Action. This can be an external service that will remove and/or deactivate users and it's messages.
- Integrate with Spam analyzis?
- ???
