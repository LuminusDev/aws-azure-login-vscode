# VS Code Azure Login AWS extension

Now you can use [AWS Azure Login](https://github.com/sportradar/aws-azure-login) directly into VS Code.

## Features

* Show all credentials from your `.aws/credentials`.
* Show if your temporary credentials are out of date.
* Refresh your temporary credentials for a profile.
* Refresh your temporary credentials for all profiles.
* Refresh your temporary credentials for all profiles when vscode starts.
* Set your default profile with another profile (be careful if you arleady have a default profile, it will be deleted).
* See which profile is used as default into the status bar.
* Easily copy the value of your keys to the clipboard.

## Requirements

Install and configure [aws-azure-login](https://github.com/sportradar/aws-azure-login).

## Extension Settings

This extension contributes the following settings:

* `awsAzureLogin.refreshOnLoad`: enable/disable an automatic refresh for all profiles when vscode starts. A profile is only getting refreshed if the time to expire is lower than 11 minutes. 
* `awsAzureLogin.commandOptions`: add option to the AWS Azure login command line executed to refresh credentials, like no sandbox. 
