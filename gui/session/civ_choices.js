const CIV_CHOICE_BUTTON_WIDTH = 200;
const CIV_CHOICE_BUTTON_SPACING = 25;

function initCivChoicesDialog()
{
	if (g_ViewedPlayer < 0) {
	//	error("wrong player");
		return;
	}

	let currentPlayer = g_Players[g_ViewedPlayer];
	let cvilisation = g_CivData[currentPlayer.civ];
	if (cvilisation === undefined) {
		error("civ is undefined");
		return;
	}
	let civ = cvilisation.Code;
	let factions = cvilisation.Factions;
	if (factions === undefined) {
		error("factions is undefined");
		return;
	}
	let civChoices = factions[0].Heroes;
	if (civChoices === undefined) {
		error("heroChoice is undefined");
		return;
	}

	for (let i = 0; i < civChoices.length; ++i)
	{
		let hero = civChoices[i];
		let tmpl = hero.Template;
		if (tmpl == undefined) {
			error("hero Template " + hero.Name + " is undefined");
			continue;
		}
		let technology = "heroes/"+tmpl.split("hero_")[1];
		let researched = Engine.GuiInterfaceCall("IsTechnologyResearched", {
			"tech": technology,
			"player": g_ViewedPlayer
		});
		if (researched)
			return;
	}

	let civChoicesDialogPanel = Engine.GetGUIObjectByName("civChoicesDialogPanel");
	let civChoicesDialogPanelWidth = civChoicesDialogPanel.size.right - civChoicesDialogPanel.size.left;
	let buttonsLength = CIV_CHOICE_BUTTON_WIDTH * civChoices.length + CIV_CHOICE_BUTTON_SPACING * (civChoices.length - 1);
	let buttonsStart = (civChoicesDialogPanelWidth - buttonsLength) / 2;

	for (let i = 0; i < civChoices.length; ++i)
	{
		let hero = civChoices[i];
		let civChoiceButton = Engine.GetGUIObjectByName("civChoice[" + i + "]");
		civChoiceButton.caption = hero.Name;

		let size = civChoiceButton.size;
		size.left = buttonsStart + (CIV_CHOICE_BUTTON_WIDTH + CIV_CHOICE_BUTTON_SPACING) * i;
		size.right = size.left + CIV_CHOICE_BUTTON_WIDTH;
		civChoiceButton.size = size;

		let tmpl = hero.Template;
		if (tmpl == undefined) {
			error("hero Template " + hero.Name + " is undefined");
			continue;
		}
		let hTemplate = tmpl;
		civChoiceButton.onPress = (function(hTemplate) { return function() {
			Engine.PostNetworkCommand({ "type": "hero-choice", "template": hTemplate});
			Engine.GetGUIObjectByName("civChoicesDialogPanel").hidden = true;
		}})(hTemplate);

		let icon = hero.Icon;
		let civChoiceIcon = Engine.GetGUIObjectByName("civChoiceIcon[" + i + "]");
		civChoiceIcon.sprite = "stretched:session/portraits/" + icon;

		civChoiceButton.hidden = false;
	}
	civChoicesDialogPanel.hidden = false;
}