# Function

## Table of contents

## Concept
You can use functions to apply custom logic in your projects. You can find the function area in **Developer Area**. Once you create your function, the system will assign its ID automatically. To create a function, you need to enter a name and a description first. This data will be displayed in the function list. After you define metadata, you will see the code editor to write your own codes. 

## Triggers
The system will run this code whenever something triggers the function. There are different types of triggers.

### Database
When something has been changed in a specific resource such as buckets or policies, it triggers the function.
> NOTE: You can toggle on “Full Document” setting if you want to get all the entry. If you toggle off this setting, you will get the changes only.

### HTTP
HTTP request will trigger the function.

### Schedule
You can run functions in time intervals. To set interval, you can use CRON based rules. As an example: if you set the time interval "`* * * * *`", function will be executed in every minute.

## Dependencies
If your function needs another 3rd party package, you can include 3rd party package as a dependency. Each dependency will be imported before the system runs the function.

## Environment Variables
You can set environment variables and these variables will be passed to function as a global parameter. To get more detail please visit API reference.
