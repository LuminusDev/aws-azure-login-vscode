// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

const ProfileProvider = require('./ProfileProvider.js');

const writeToClipboard = (text, display) => {
	vscode.env.clipboard.writeText(text)
		.then(() => {
			return vscode.window.showInformationMessage(`Successfully copy the value of ${display} to the clipboard.`);
		}, (err) => {
				console.debug(err);
				vscode.window.showErrorMessage(`Unable to copy the value of ${display} to the clipboard.`);
		});
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('Congratulations, your extension "azureloginaws" is now active!');

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.tooltip = `Select default AWS profile`;
	statusBarItem.command = `profileProvider.setDefaultProfileWithStatusBar`;

	const profileProvider = new ProfileProvider(statusBarItem);
	vscode.window.registerTreeDataProvider('credentials', profileProvider);
	vscode.commands.registerCommand('profileProvider.showHideHardToken', () => profileProvider.showHideHardToken());
	vscode.commands.registerCommand('profileProvider.refreshEntry', () => profileProvider.refresh());
	vscode.commands.registerCommand('profileProvider.refreshToken', (profile) => profileProvider.refreshToken(profile, false));
	vscode.commands.registerCommand('profileProvider.refreshTokenWithPrompt', (profile) => profileProvider.refreshToken(profile, true));
	vscode.commands.registerCommand('profileProvider.refreshAllTokens', () => profileProvider.refreshToken(undefined, false));
	vscode.commands.registerCommand('profileProvider.setDefaultProfile', (profile) => profileProvider.setDefaultProfile(profile));
	vscode.commands.registerCommand('profileProvider.setDefaultProfileWithStatusBar', () => profileProvider.setDefaultProfileWithStatusBar());
	vscode.commands.registerCommand('extension.writeClipboard', (text, display) => writeToClipboard(text, display));


	profileProvider.firstLoadAction();
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
