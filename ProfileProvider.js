const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

class ProfileProvider {
    constructor(statusBarItem) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        const homedir = require('os').homedir();
        this.credentialsPath = `${homedir}/.aws/credentials`;
        this.statusBarItem = statusBarItem;
        this.mustShowHardToken = true;
    }

    firstLoadAction() {
        const refresh = vscode.workspace.getConfiguration('awsAzureLogin').get('refreshOnLoad');
        if (refresh) {
            this.refreshToken(undefined, false);
        }
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    refreshToken(profile, withPrompt) {
        const alwaysOpenNewTerminal = vscode.workspace.getConfiguration('awsAzureLogin').get('alwaysOpenNewTerminal');
        let terminal = vscode.window.activeTerminal;
        if (terminal === undefined || alwaysOpenNewTerminal) {
            terminal = vscode.window.createTerminal();
        }
        terminal.show();
        let command = "aws-azure-login -f";
        command += profile ? ` --profile ${profile.profile.associatedProfile}` : ' --all-profiles';
        command += withPrompt ? '' : ' --no-prompt';
        command += ` ${vscode.workspace.getConfiguration('awsAzureLogin').get('commandOptions').trim()}`;
        terminal.sendText(command);
    }

    showHideHardToken() {
        this.mustShowHardToken = !this.mustShowHardToken;
        this._onDidChangeTreeData.fire();
    }

    setDefaultProfile(profile) {
        const lines = fs.readFileSync(this.credentialsPath, 'utf-8');

        let newFile = '';
        let editProfile = false;
        let defaultExist = false;

        let writeDefault = (profile) => {
            let lines = "";
            for (let confParameterKey in profile.profile.conf) {
                lines += `${confParameterKey}=${profile.profile.conf[confParameterKey]}\r\n`;
            }
            lines += `\r\n`
            return lines;
        };

        lines.split('\n').forEach((line) => {
            line = line.trim()
            if (line === '[default]') {
                defaultExist = true;
                editProfile = true;
                newFile += `${line}\r\n`;
                newFile += writeDefault(profile);
            } else if (line.startsWith('[') && line.endsWith(']')) {
                editProfile = false;
            }
            if (!editProfile) {
                newFile += `${line}\r\n`;
            }
        });

        if (!defaultExist) {
            newFile += '[default]\r\n';
            newFile += writeDefault(profile);
        }

        fs.writeFileSync(this.credentialsPath, newFile.trim(), 'utf-8');
        vscode.window.showInformationMessage(`Default AWS profile set to : ${profile.profile.name}`);
        this._onDidChangeTreeData.fire();
    }

    async setDefaultProfileWithStatusBar() {
        const profiles = this.getProfiles();
        const filteredProfiles = this.filteredProfiles(profiles, false);
        const newDefaultProfile = await vscode.window.showQuickPick(filteredProfiles, {placeHolder: `Select the AWS profile to set as the [default] profile in the 'credentials' file.` });
        if (newDefaultProfile) {
            this.setDefaultProfile({'profile': newDefaultProfile});
        }
    }

    getProfileNameSetByDefault(profiles) {
        const defaultProfile = profiles.find(profile => profile.name === 'default');
        const usedProfile = defaultProfile ? profiles.find(profile =>
            profile.name !== defaultProfile.name &&
            profile.conf['aws_access_key_id'] === defaultProfile.conf['aws_access_key_id'] &&
            profile.conf['aws_secret_access_key'] === defaultProfile.conf['aws_secret_access_key']
        ) : undefined;
        return usedProfile ? usedProfile.name : undefined;
    }

    updateStatusBar(profileName) {
        if (profileName) {
            this.statusBarItem.text = `$(plug) AWS default: ${profileName}`;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    getProfiles() {
        const lines = fs.readFileSync(this.credentialsPath, 'utf-8');

        const profiles = [];

        lines.split('\n').forEach((line) => {
            line = line.trim()
            if (line.startsWith('[') && line.endsWith(']')) {
                profiles.push({
                    'name': line.slice(1, -1),
                    'label': line.slice(1, -1),
                    'display': line.slice(1, -1),
                    'associatedProfile': line.slice(1, -1),
                    'conf': {},
                });
            } else if (line !== '') {
                const item = [line.substring(0, line.indexOf("=")), line.substring(line.indexOf("=") + 1)];
                if (item.length !== 2) {
                    vscode.window.showErrorMessage('Unknown format for the credentials file.');
                    return;
                }
                if (item[0].includes("expiration")) {
                    let expiration = new Date(item[1]);
                    let now = new Date();
                    profiles[profiles.length - 1]['expired'] = expiration.getTime() < now.getTime();
                    profiles[profiles.length - 1]['expirationDate'] = expiration.toISOString().slice(0, 19).replace("T", " ");
                    profiles[profiles.length - 1]['sts'] = true;
                } else {
                    profiles[profiles.length - 1]['sts'] = false;
                }
                profiles[profiles.length - 1]['conf'][item[0]] = item[1];
            }
        });

        return profiles.sort((a, b) => a.name.localeCompare(b.name));
    }

    filteredProfiles(profiles, includeDefaultProfile = true) {
        const filtered = profiles.filter(profile => profile.sts || this.mustShowHardToken);
        if (!includeDefaultProfile) {
            return filtered.filter(profile => profile.name !== 'default');
        } else {
            return filtered;
        }
    }

    getChildren(profile) {
        if (!profile) {
            const profiles = this.getProfiles();
            const profileName = this.getProfileNameSetByDefault(profiles);

            if (profileName) {
                const defaultProfile = profiles.find(profile => profile.name === 'default');
                defaultProfile.display = `default (${profileName})`;
                defaultProfile.associatedProfile = profileName;
            }
            this.updateStatusBar(profileName);

            const profilesFiltered = this.filteredProfiles(profiles);

            return profilesFiltered.map(profile => new TreeProfile(profile, profile.display, vscode.TreeItemCollapsibleState.Collapsed));
        } else if (profile.profile) {
            return Object.keys(profile.profile.conf).map(confParameterKey => {
                return new TreeKeyValue(
                    `${confParameterKey} = ${profile.profile.conf[confParameterKey]}`,
                    vscode.TreeItemCollapsibleState.None, {
                        command: 'extension.writeClipboard',
                        title: 'Click to copy value',
                        arguments: [profile.profile.conf[confParameterKey], confParameterKey]
                    },
                    'Click to copy value'
                );
            });
        }
    }

    getTreeItem(profile) {
        return profile;
    }
}

class TreeKeyValue extends vscode.TreeItem {
    constructor(label, collapsibleState, command, tooltip) {
        super(label, collapsibleState);
        this.command = command;
        this.tooltip = tooltip;
    }
}

class TreeProfile extends vscode.TreeItem {
    constructor(profile, label, collapsibleState) {
        super(label, collapsibleState);
        this.profile = profile;
        if (profile.sts === false) {
            this.iconPath = {
                light: path.join(__dirname, '.', 'media', 'light', 'warning.svg'),
                dark: path.join(__dirname, '.', 'media', 'dark', 'warning.svg')
            }
            this.tooltip = "Credentials are not temporary";
        } else if (profile.expired === true) {
            this.iconPath = {
                light: path.join(__dirname, '.', 'media', 'light', 'error.svg'),
                dark: path.join(__dirname, '.', 'media', 'dark', 'error.svg')
            }
        }
        if (profile.sts === true) {
            this.contextValue = 'refreshableToken';
            this.tooltip = `Expiration : ${profile.expirationDate}`;
        } else {
            this.contextValue = 'hardToken';
        }
        if (profile.name === 'default') {
            this.contextValue = 'default';
        }
    }
}

module.exports = ProfileProvider;
