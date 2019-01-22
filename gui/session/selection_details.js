function layoutSelectionSingle()
{
	Engine.GetGUIObjectByName("detailsAreaSingle").hidden = false;
	Engine.GetGUIObjectByName("detailsAreaMultiple").hidden = true;
	Engine.GetGUIObjectByName("selectionFormation").hidden = true;
}

function layoutSelectionMultiple()
{
	Engine.GetGUIObjectByName("detailsAreaMultiple").hidden = false;
	Engine.GetGUIObjectByName("detailsAreaSingle").hidden = true;
	Engine.GetGUIObjectByName("selectionFormation").hidden = true;
}

function getResourceTypeDisplayName(resourceType)
{
	return resourceNameFirstWord(
		resourceType.generic == "treasure" ?
			resourceType.specific :
			resourceType.generic);
}

// Updates the health bar of garrisoned units
function updateGarrisonHealthBar(entState, selection)
{
	if (!entState.garrisonHolder)
		return;

	// Summing up the Health of every single unit
	let totalGarrisonHealth = 0;
	let aTotalGarrisonHealth = 0;
	let maxGarrisonHealth = 0;
	let aMaxGarrisonHealth = 0;
	for (let selEnt of selection)
	{
		let selEntState = GetEntityState(selEnt);
		if (selEntState.garrisonHolder) {
			for (let ent of selEntState.garrisonHolder.entities)
			{
				let state = GetEntityState(ent);
				if (!state)
					continue;
				totalGarrisonHealth += state.hitpoints || 0;
				maxGarrisonHealth += state.maxHitpoints || 0;
			}
			for (let ent of selEntState.garrisonHolder.attackerEntities)
			{
				let state = GetEntityState(ent);
				if (!state)
					continue;
				aTotalGarrisonHealth += state.hitpoints || 0;
				aMaxGarrisonHealth += state.maxHitpoints || 0;
			}
		}
	}

	// Configuring the health bar
	let healthGarrison = Engine.GetGUIObjectByName("healthGarrison");
	healthGarrison.hidden = totalGarrisonHealth <= 0;
	if (totalGarrisonHealth > 0)
	{
		let healthBarGarrison = Engine.GetGUIObjectByName("healthBarGarrison");
		let healthSize = healthBarGarrison.size;
		healthSize.rtop = 100 - 100 * Math.max(0, Math.min(1, totalGarrisonHealth / maxGarrisonHealth));
		healthBarGarrison.size = healthSize;

		healthGarrison.tooltip = getCurrentHealthTooltip({
			"hitpoints": totalGarrisonHealth,
			"maxHitpoints": maxGarrisonHealth
		});
	}
	let aHealthGarrison = Engine.GetGUIObjectByName("aHealthGarrison");
	aHealthGarrison.hidden = aTotalGarrisonHealth <= 0;
	if (aTotalGarrisonHealth > 0)
	{
		let aHealthBarGarrison = Engine.GetGUIObjectByName("aHealthBarGarrison");
		let aHealthSize = aHealthBarGarrison.size;
		aHealthSize.rtop = 100 - 100 * Math.max(0, Math.min(1, aTotalGarrisonHealth / aMaxGarrisonHealth));
		aHealthBarGarrison.size = aHealthSize;

		aHealthGarrison.tooltip = getCurrentHealthTooltip({
			"hitpoints": aTotalGarrisonHealth,
			"maxHitpoints": aMaxGarrisonHealth
		});
	}
}

// Fills out information that most entities have
function displaySingle(entState)
{
	Engine.GetGUIObjectByName("selectionFormation").hidden = true;
	// Get general unit and player data
	let template = GetTemplateData(entState.template);
	let specificName = template.name.specific;
	let genericName = template.name.generic;
	// If packed, add that to the generic name (reduces template clutter)
	if (genericName && template.pack && template.pack.state == "packed")
		genericName = sprintf(translate("%(genericName)s — Packed"), { "genericName": genericName });
	let playerState = g_Players[entState.player];

	let civName = g_CivData[playerState.civ].Name;
	let civEmblem = g_CivData[playerState.civ].Emblem;

	let playerName = playerState.name;
	let playerColor = rgbToGuiColor(g_DisplayedPlayerColors[entState.player], 128);

	// Indicate disconnected players by prefixing their name
	if (g_Players[entState.player].offline)
		playerName = sprintf(translate("\\[OFFLINE] %(player)s"), { "player": playerName });

	// Rank
	if (entState.experience && entState.experience.rank)
	{
		Engine.GetGUIObjectByName("rankIcon").tooltip = sprintf(translate("%(rank)s Rank"), {
			"rank": translateWithContext("Rank", entState.experience.rank)
		});
		Engine.GetGUIObjectByName("rankIcon").sprite = "stretched:session/icons/ranks/" + entState.experience.rank + ".png";
		Engine.GetGUIObjectByName("rankIcon").hidden = false;
	}
	else
	{
		Engine.GetGUIObjectByName("rankIcon").hidden = true;
		Engine.GetGUIObjectByName("rankIcon").tooltip = "";
	}

	Engine.GetGUIObjectByName("icon").hidden = false;
	Engine.GetGUIObjectByName("iconBorder").hidden = false;
	Engine.GetGUIObjectByName("healthSection").hidden = false;
	Engine.GetGUIObjectByName("captureSection").hidden = false;
	Engine.GetGUIObjectByName("resourceSection").hidden = false;
	Engine.GetGUIObjectByName("sectionPosTop").hidden = false;
	Engine.GetGUIObjectByName("sectionPosMiddle").hidden = false;
	Engine.GetGUIObjectByName("sectionPosBottom").hidden = false;
	Engine.GetGUIObjectByName("specific").hidden = false;
	Engine.GetGUIObjectByName("player").hidden = false;
	Engine.GetGUIObjectByName("playerColorBackground").hidden = false;
	Engine.GetGUIObjectByName("generic").hidden = false;
	Engine.GetGUIObjectByName("playerCivIcon").hidden = false;
	Engine.GetGUIObjectByName("attackAndArmorStats").hidden = false;

	let showHealth = entState.hitpoints;
	let showResource = entState.resourceSupply;
	let showEnergy = entState.energy;

	let healthSection = Engine.GetGUIObjectByName("healthSection");
	let energySection = Engine.GetGUIObjectByName("energySection");
	let captureSection = Engine.GetGUIObjectByName("captureSection");
	let resourceSection = Engine.GetGUIObjectByName("resourceSection");
	let sectionPosTop = Engine.GetGUIObjectByName("sectionPosTop");
	let sectionPosMiddle = Engine.GetGUIObjectByName("sectionPosMiddle");
	let sectionPosBottom = Engine.GetGUIObjectByName("sectionPosBottom");
	
	// Hitpoints
	healthSection.hidden = !showHealth;
	if (showHealth)
	{
		let unitHealthBar = Engine.GetGUIObjectByName("healthBar");
		let healthSize = unitHealthBar.size;
		healthSize.rright = 100 * Math.max(0, Math.min(1, entState.hitpoints / entState.maxHitpoints));
		unitHealthBar.size = healthSize;
		Engine.GetGUIObjectByName("healthStats").caption = sprintf(translate("%(hitpoints)s / %(maxHitpoints)s"), {
			"hitpoints": Math.ceil(entState.hitpoints),
			"maxHitpoints": Math.ceil(entState.maxHitpoints)
		});

		healthSection.size = sectionPosTop.size;
		captureSection.size = showResource ? sectionPosMiddle.size : sectionPosBottom.size;
		resourceSection.size = showResource ? sectionPosBottom.size : sectionPosMiddle.size;
	}
	else
	{
		captureSection.size = sectionPosBottom.size;
		resourceSection.size = sectionPosTop.size;
	}

	// Energy
	energySection.hidden = !showEnergy;
	if (showEnergy)
	{
		let unitEnergyBar = Engine.GetGUIObjectByName("energyBar");
		let energySize = unitEnergyBar.size;
		energySize.rright = 100 * Math.max(0, Math.min(1, entState.energy.points / entState.energy.maxPoints));
		unitEnergyBar.size = energySize;
		Engine.GetGUIObjectByName("energyStats").caption = sprintf(translate("%(hitpoints)s / %(maxHitpoints)s"), {
			"hitpoints": Math.ceil(entState.energy.points),
			"maxHitpoints": Math.ceil(entState.energy.maxPoints)
		});
		Engine.GetGUIObjectByName("energy").tooltip = sprintf("Energy: +%(regenRate)s points while idle", {
			"regenRate": Math.ceil(entState.energy.regenRate)
		});
		energySection.size = sectionPosBottom.size;
	}

	// CapturePoints
	captureSection.hidden = !entState.capturePoints;
	if (entState.capturePoints)
	{
		let setCaptureBarPart = function(playerID, startSize) {
			let unitCaptureBar = Engine.GetGUIObjectByName("captureBar[" + playerID + "]");
			let sizeObj = unitCaptureBar.size;
			sizeObj.rleft = startSize;

			let size = 100 * Math.max(0, Math.min(1, entState.capturePoints[playerID] / entState.maxCapturePoints));
			sizeObj.rright = startSize + size;
			unitCaptureBar.size = sizeObj;
			unitCaptureBar.sprite = "color:" + rgbToGuiColor(g_DisplayedPlayerColors[playerID], 128);
			unitCaptureBar.hidden = false;
			return startSize + size;
		};

		// first handle the owner's points, to keep those points on the left for clarity
		let size = setCaptureBarPart(entState.player, 0);

		for (let i in entState.capturePoints)
			if (i != entState.player)
				size = setCaptureBarPart(i, size);

		let captureText = sprintf(translate("%(capturePoints)s / %(maxCapturePoints)s"), {
			"capturePoints": Math.ceil(entState.capturePoints[entState.player]),
			"maxCapturePoints": Math.ceil(entState.maxCapturePoints)
		});

		let showSmallCapture = showResource && showHealth;
		Engine.GetGUIObjectByName("captureStats").caption = showSmallCapture ? "" : captureText;
		Engine.GetGUIObjectByName("capture").tooltip = showSmallCapture ? captureText : "";
	}

	// Experience
	Engine.GetGUIObjectByName("experience").hidden = !entState.experience || entState.experience.maxLevel;
	if (entState.experience)
	{
		let experienceBar = Engine.GetGUIObjectByName("experienceBar");
		let experienceSize = experienceBar.size;
		experienceSize.rtop = 100 - (100 * Math.max(0, Math.min(1, 1.0 * +entState.experience.curr / +entState.experience.req)));
		experienceBar.size = experienceSize;

		if (entState.experience.curr < entState.experience.req)
			Engine.GetGUIObjectByName("experience").tooltip = sprintf(translate("%(experience)s %(current)s / %(required)s"), {
				"experience": "[font=\"sans-bold-13\"]" + translate("Experience:") + "[/font]",
				"current": Math.floor(entState.experience.curr),
				"required": entState.experience.req
			});
		else
			Engine.GetGUIObjectByName("experience").tooltip = sprintf(translate("%(experience)s %(current)s"), {
				"experience": "[font=\"sans-bold-13\"]" + translate("Experience:") + "[/font]",
				"current": Math.floor(entState.experience.curr)
			});
	}

	// Resource stats
	resourceSection.hidden = !showResource;
	if (entState.resourceSupply)
	{
		let resources = entState.resourceSupply.isInfinite ? translate("∞") :  // Infinity symbol
			sprintf(translate("%(amount)s / %(max)s"), {
				"amount": Math.ceil(+entState.resourceSupply.amount),
				"max": entState.resourceSupply.max
			});

		let unitResourceBar = Engine.GetGUIObjectByName("resourceBar");
		let resourceSize = unitResourceBar.size;

		resourceSize.rright = entState.resourceSupply.isInfinite ? 100 :
			100 * Math.max(0, Math.min(1, +entState.resourceSupply.amount / +entState.resourceSupply.max));
		unitResourceBar.size = resourceSize;

		Engine.GetGUIObjectByName("resourceLabel").caption = sprintf(translate("%(resource)s:"), {
			"resource": getResourceTypeDisplayName(entState.resourceSupply.type)
		});
		Engine.GetGUIObjectByName("resourceStats").caption = resources;

	}

	let resourceCarryingIcon = Engine.GetGUIObjectByName("resourceCarryingIcon");
	let resourceCarryingText = Engine.GetGUIObjectByName("resourceCarryingText");
	resourceCarryingIcon.hidden = false;
	resourceCarryingText.hidden = false;

	// Resource carrying
	if (entState.resourceCarrying && entState.resourceCarrying.length)
	{
		// We should only be carrying one resource type at once, so just display the first
		let carried = entState.resourceCarrying[0];
		resourceCarryingIcon.sprite = "stretched:session/icons/resources/" + carried.type + ".png";
		resourceCarryingText.caption = sprintf(translate("%(amount)s / %(max)s"), { "amount": carried.amount, "max": carried.max });
		resourceCarryingIcon.tooltip = "";
	}
	// Use the same indicators for traders
	else if (entState.trader && entState.trader.goods.amount)
	{
		resourceCarryingIcon.sprite = "stretched:session/icons/resources/" + entState.trader.goods.type + ".png";
		let totalGain = entState.trader.goods.amount.traderGain;
		if (entState.trader.goods.amount.market1Gain)
			totalGain += entState.trader.goods.amount.market1Gain;
		if (entState.trader.goods.amount.market2Gain)
			totalGain += entState.trader.goods.amount.market2Gain;
		resourceCarryingText.caption = totalGain;
		resourceCarryingIcon.tooltip = sprintf(translate("Gain: %(gain)s"), {
			"gain": getTradingTooltip(entState.trader.goods.amount)
		});
	}
	// And for number of workers
	else if (entState.foundation)
	{
		resourceCarryingIcon.sprite = "stretched:session/icons/repair.png";
		resourceCarryingIcon.tooltip = getBuildTimeTooltip(entState);
		resourceCarryingText.caption = entState.foundation.numBuilders ?
			Engine.FormatMillisecondsIntoDateStringGMT(entState.foundation.buildTime.timeRemaining * 1000, translateWithContext("countdown format", "m:ss")) : "";
	}
	else if (!!entState.attack && !!entState.attack["Ranged"] && !!entState.attack["Ranged"].ammoMax)
	{
		resourceCarryingIcon.sprite = "stretched:session/icons/repair.png";
		resourceCarryingIcon.tooltip = "ammo";
		resourceCarryingText.caption = "K";
		resourceCarryingText.caption = sprintf("%(ammo)s / %(max)s", {
			"ammo": entState.attack["Ranged"].ammoLeft,
			"max": entState.attack["Ranged"].ammoMax
		});
	}
	else if (entState.resourceSupply && (!entState.resourceSupply.killBeforeGather || !entState.hitpoints))
	{
		resourceCarryingIcon.sprite = "stretched:session/icons/repair.png";
		resourceCarryingText.caption = sprintf(translate("%(amount)s / %(max)s"), {
			"amount": entState.resourceSupply.numGatherers,
			"max": entState.resourceSupply.maxGatherers
		});
		Engine.GetGUIObjectByName("resourceCarryingIcon").tooltip = translate("Current/max gatherers");
	}
	else if (entState.repairable && entState.needsRepair)
	{
		resourceCarryingIcon.sprite = "stretched:session/icons/repair.png";
		resourceCarryingIcon.tooltip = getRepairTimeTooltip(entState);
		resourceCarryingText.caption = entState.repairable.numBuilders ?
			Engine.FormatMillisecondsIntoDateStringGMT(entState.repairable.buildTime.timeRemaining * 1000, translateWithContext("countdown format", "m:ss")) : "";
	}
	else
	{
		resourceCarryingIcon.hidden = true;
		resourceCarryingText.hidden = true;
	}

	Engine.GetGUIObjectByName("specific").caption = specificName;
	Engine.GetGUIObjectByName("player").caption = playerName;
	Engine.GetGUIObjectByName("playerColorBackground").sprite = "color:" + playerColor;
	Engine.GetGUIObjectByName("generic").caption = genericName == specificName ? "" :
		sprintf(translate("(%(genericName)s)"), {
			"genericName": genericName
		});

	let isGaia = playerState.civ == "gaia";
	Engine.GetGUIObjectByName("playerCivIcon").sprite = isGaia ? "" : "stretched:grayscale:" + civEmblem;
	Engine.GetGUIObjectByName("player").tooltip = isGaia ? "" : civName;

	// TODO: we should require all entities to have icons
	Engine.GetGUIObjectByName("icon").sprite = template.icon ? ("stretched:session/portraits/" + template.icon) : "BackgroundBlack";
	if (template.icon)
		Engine.GetGUIObjectByName("iconBorder").onPressRight = () => {
			showTemplateDetails(entState.template);
		};

	Engine.GetGUIObjectByName("attackAndArmorStats").tooltip = [
		getAttackTooltip,
		getSplashDamageTooltip,
		getHealerTooltip,
		getArmorTooltip,
		getGatherTooltip,
		getSpeedTooltip,
		getGarrisonTooltip,
		getProjectilesTooltip,
		getResourceTrickleTooltip,
		getLootTooltip
	].map(func => func(entState)).filter(tip => tip).join("\n");

	let iconTooltips = [];

	if (genericName)
		iconTooltips.push("[font=\"sans-bold-16\"]" + genericName + "[/font]");

	iconTooltips = iconTooltips.concat([
		getVisibleEntityClassesFormatted,
		getAurasTooltip,
		getEntityTooltip,
		showTemplateViewerOnRightClickTooltip
	].map(func => func(template)));

	Engine.GetGUIObjectByName("iconBorder").tooltip = iconTooltips.filter(tip => tip).join("\n");

	Engine.GetGUIObjectByName("detailsAreaSingle").hidden = false;
	Engine.GetGUIObjectByName("detailsAreaMultiple").hidden = true;
	Engine.GetGUIObjectByName("detailsAreaFormation").hidden = true;
}

function displayFormation(entStates, fState)
{
	if (!fState) {
		displayMultiple(entStates);
		return;
	}
	Engine.GetGUIObjectByName("selectionDetails").hidden = true;
	
	let template = GetTemplateData(fState.template);
	
	let playerState = g_Players[fState.player];
	let civName = g_CivData[playerState.civ].Name;
	let civEmblem = g_CivData[playerState.civ].Emblem;
	let playerName = playerState.name;
	let playerColor = rgbToGuiColor(g_DisplayedPlayerColors[fState.player], 128);
	
	// Player data
	Engine.GetGUIObjectByName("formPlayer").caption = playerName;
	Engine.GetGUIObjectByName("formPlayerColorBackground").sprite = "color:" + playerColor;
	let isGaia = playerState.civ == "gaia";
	Engine.GetGUIObjectByName("formPlayerCivIcon").sprite = isGaia ? "" : "stretched:grayscale:" + civEmblem;
	Engine.GetGUIObjectByName("formPlayer").tooltip = isGaia ? "" : civName;
	
	let unitTemplate = GetTemplateData(fState.formation.unitTemplate);
	
	Engine.GetGUIObjectByName("formFightStatsAttackImage").tooltip = "Melee";
	Engine.GetGUIObjectByName("formFightStatsAttackRangeImage").tooltip = "Ranged";
	Engine.GetGUIObjectByName("formFightStatsArmorImage").tooltip = "Armor";
	Engine.GetGUIObjectByName("formFightStatsShieldImage").tooltip = "Shield";
	
	Engine.GetGUIObjectByName("formFightStatsArmorNum").caption = sumTemplateArmor(unitTemplate);
	Engine.GetGUIObjectByName("formFightStatsShieldNum").caption = sumTemplateShield(unitTemplate);
	Engine.GetGUIObjectByName("formFightStatsAttackNum").caption = sumTemplateAttack(unitTemplate);
	Engine.GetGUIObjectByName("formFightStatsAttackRangeNum").caption = sumTemplateRanged(unitTemplate);
	
	// Get formation tempalte	
	let healthSection = Engine.GetGUIObjectByName("formationEntityHealthSection");
	let ammoSection   = Engine.GetGUIObjectByName("formationEntityAmmoSection");
	let energySection = Engine.GetGUIObjectByName("formationEntityEnergySection");
	let moraleSection = Engine.GetGUIObjectByName("formationEntityMoraleSection");

	let unitIcon = Engine.GetGUIObjectByName("formationEntityImage");
	let formIcon = Engine.GetGUIObjectByName("formationFormImage");
	
	unitIcon.sprite = "stretched:session/portraits/" + fState.formation.unitIcon;
	
	unitIcon.tooltip = unitTemplate.name.specific;
	unitIcon.tooltip += "\n("+ unitTemplate.name.generic +")";
	
	formIcon.sprite = "stretched:session/portraits/" + fState.identity.icon;
	
	formIcon.tooltip = "Formaiton: " + template.name.specific;
	
	Engine.GetGUIObjectByName("formStatCount").caption = "Count: " + fState.formation.membersCount;
	
	let averageHealth = 0;
	let maxHealth = 0;
	let playerID = 0;
	let avAmmo = 0;
	let maxAmmo = 0;
	let maxEnergy = 0;
	let avEnergy = 0;
	let avMorale = 0;
	let maxMorale = 0;
	for (let entState of entStates)
	{
		playerID = entState.player; // trust that all selected entities have the same owner
		if (entState.hitpoints)
		{
			averageHealth += entState.hitpoints;
			maxHealth += entState.maxHitpoints;
		}
		if (!!entState.attack["Ranged"] && !!entState.attack["Ranged"].ammoMax) {
			avAmmo += +entState.attack["Ranged"].ammoLeft;
			maxAmmo += +entState.attack["Ranged"].ammoMax;
		}
		if (entState.energy) {
			avEnergy += entState.energy.points;
			maxEnergy += entState.energy.maxPoints;
		}
		if (entState.morale) {
			avMorale += entState.morale.points;
			maxMorale += entState.morale.maxPoints;
		}
	}
	
	Engine.GetGUIObjectByName("formStatHealth").caption = formHealthString(averageHealth, maxHealth);
	Engine.GetGUIObjectByName("formStatEnergy").caption = formEnergyString(avEnergy, maxEnergy);
	Engine.GetGUIObjectByName("formStatMorale").caption = formMoraleString(avMorale, maxMorale);
	
	/*
	if (fState.formation.maxMembers > 0) {
		let unitCountBar = Engine.GetGUIObjectByName("formationEntityCountBar");
		let countSize = unitCountBar.size;
		countSize.rright = 100 * Math.max(0, Math.min(1, fState.formation.membersCount / fState.formation.maxMembers));
		unitCountBar.size = countSize;
		Engine.GetGUIObjectByName("formationEntityCount").tooltip = "Count: " + fState.formation.membersCount + "/" + fState.formation.maxMembers;
	}
	if (maxHealth > 0)
	{
		let unitHealthBar = Engine.GetGUIObjectByName("formationEntityHealthBar");
		let healthSize = unitHealthBar.size;
		healthSize.rright = 100 * Math.max(0, Math.min(1, averageHealth / maxHealth));
		unitHealthBar.size = healthSize;
		
		let unitHealthT = Engine.GetGUIObjectByName("formationEntityHealth");
		unitHealthT.tooltip = "Health: " + averageHealth + "/" + maxHealth;
	}
	if (maxAmmo > 0)
	{
		let unitAmmoBar = Engine.GetGUIObjectByName("formationEntityAmmoBar");
		let ammoSize = unitAmmoBar.size;
		ammoSize.rright = 100 * Math.max(0, Math.min(1, avAmmo / maxAmmo));
		unitAmmoBar.size = ammoSize;
		Engine.GetGUIObjectByName("formationEntityAmmo").tooltip = "Ammo: " + avAmmo + "/" + maxAmmo;
	}		
	ammoSection.hidden = !maxAmmo;
	if (maxEnergy > 0) {
		let unitenergyBar = Engine.GetGUIObjectByName("formationEntityEnergyBar");
		let energySize = unitenergyBar.size;
		energySize.rright = 100 * Math.max(0, Math.min(1, avEnergy / maxEnergy));
		unitenergyBar.size = energySize;
		Engine.GetGUIObjectByName("formationEntityEnergy").tooltip = "Energy: " + avEnergy + "/"+ maxEnergy;;
	}
	moraleSection.hidden = !maxMorale;
	if (maxMorale > 0) {
		let unitmoraleBar = Engine.GetGUIObjectByName("formationEntityMoraleBar");
		let moraleSize = unitmoraleBar.size;
		moraleSize.rright = 100 * Math.max(0, Math.min(1, avMorale / maxMorale));
		unitmoraleBar.size = moraleSize;
		Engine.GetGUIObjectByName("formationEntityMorale").tooltip = "Morale: " + avMorale + "/" + maxMorale;
	}
	moraleSection.hidden = !maxMorale;
	*/
	
	// Unhide Details Area
	Engine.GetGUIObjectByName("detailsAreaSingle").hidden = true;
	Engine.GetGUIObjectByName("detailsAreaMultiple").hidden = true;
	Engine.GetGUIObjectByName("selectionFormation").hidden = false;
	Engine.GetGUIObjectByName("detailsAreaFormation").hidden = false;

	Engine.GetGUIObjectByName("formationEntityPanel").hidden = false;
}

// Fills out information for multiple entities
function displayMultiple(entStates)
{
	Engine.GetGUIObjectByName("selectionFormation").hidden = true;
	let averageHealth = 0;
	let maxHealth = 0;
	let maxCapturePoints = 0;
	let capturePoints = (new Array(g_MaxPlayers + 1)).fill(0);
	let playerID = 0;
	let totalCarrying = {};
	let totalLoot = {};

	for (let entState of entStates)
	{
		playerID = entState.player; // trust that all selected entities have the same owner
		if (entState.hitpoints)
		{
			averageHealth += entState.hitpoints;
			maxHealth += entState.maxHitpoints;
		}
		if (entState.capturePoints)
		{
			maxCapturePoints += entState.maxCapturePoints;
			capturePoints = entState.capturePoints.map((v, i) => v + capturePoints[i]);
		}

		let carrying = calculateCarriedResources(
			entState.resourceCarrying || null,
			entState.trader && entState.trader.goods
		);

		if (entState.loot)
			for (let type in entState.loot)
				totalLoot[type] = (totalLoot[type] || 0) + entState.loot[type];

		for (let type in carrying)
		{
			totalCarrying[type] = (totalCarrying[type] || 0) + carrying[type];
			totalLoot[type] = (totalLoot[type] || 0) + carrying[type];
		}
	}

	Engine.GetGUIObjectByName("healthMultiple").hidden = averageHealth <= 0;
	if (averageHealth > 0)
	{
		let unitHealthBar = Engine.GetGUIObjectByName("healthBarMultiple");
		let healthSize = unitHealthBar.size;
		healthSize.rtop = 100 - 100 * Math.max(0, Math.min(1, averageHealth / maxHealth));
		unitHealthBar.size = healthSize;

		Engine.GetGUIObjectByName("healthMultiple").tooltip = getCurrentHealthTooltip({
			"hitpoints": averageHealth,
			"maxHitpoints": maxHealth
		});
	}

	Engine.GetGUIObjectByName("captureMultiple").hidden = maxCapturePoints <= 0;
	if (maxCapturePoints > 0)
	{
		let setCaptureBarPart = function(pID, startSize)
		{
			let unitCaptureBar = Engine.GetGUIObjectByName("captureBarMultiple[" + pID + "]");
			let sizeObj = unitCaptureBar.size;
			sizeObj.rtop = startSize;

			let size = 100 * Math.max(0, Math.min(1, capturePoints[pID] / maxCapturePoints));
			sizeObj.rbottom = startSize + size;
			unitCaptureBar.size = sizeObj;
			unitCaptureBar.sprite = "color:" + rgbToGuiColor(g_DisplayedPlayerColors[pID], 128);
			unitCaptureBar.hidden = false;
			return startSize + size;
		};

		let size = 0;
		for (let i in capturePoints)
			if (i != playerID)
				size = setCaptureBarPart(i, size);

		// last handle the owner's points, to keep those points on the bottom for clarity
		setCaptureBarPart(playerID, size);

		Engine.GetGUIObjectByName("captureMultiple").tooltip = getCurrentHealthTooltip(
			{
				"hitpoints": capturePoints[playerID],
				"maxHitpoints": maxCapturePoints
			},
			translate("Capture Points:"));
	}

	let numberOfUnits = Engine.GetGUIObjectByName("numberOfUnits");
	numberOfUnits.caption = entStates.length;
	numberOfUnits.tooltip = "";

	if (Object.keys(totalCarrying).length)
		numberOfUnits.tooltip = sprintf(translate("%(label)s %(details)s\n"), {
			"label": headerFont(translate("Carrying:")),
			"details": bodyFont(Object.keys(totalCarrying).filter(
				res => totalCarrying[res] != 0).map(
				res => sprintf(translate("%(type)s %(amount)s"),
					{ "type": resourceIcon(res), "amount": totalCarrying[res] })).join("  "))
		});

	if (Object.keys(totalLoot).length)
		numberOfUnits.tooltip += sprintf(translate("%(label)s %(details)s"), {
			"label": headerFont(translate("Loot:")),
			"details": bodyFont(Object.keys(totalLoot).filter(
				res => totalLoot[res] != 0).map(
				res => sprintf(translate("%(type)s %(amount)s"),
					{ "type": resourceIcon(res), "amount": totalLoot[res] })).join("  "))
		});

	// Unhide Details Area
	Engine.GetGUIObjectByName("detailsAreaMultiple").hidden = false;
	Engine.GetGUIObjectByName("detailsAreaSingle").hidden = true;
	Engine.GetGUIObjectByName("selectionFormation").hidden = true;
}

// Updates middle entity Selection Details Panel and left Unit Commands Panel
function updateSelectionDetails()
{
	let supplementalDetailsPanel = Engine.GetGUIObjectByName("supplementalSelectionDetails");
	let detailsPanel = Engine.GetGUIObjectByName("selectionDetails");
	let commandsPanel = Engine.GetGUIObjectByName("unitCommands");

	let entStates = [];

	for (let sel of g_Selection.toList())
	{
		//warn(sel + ": sel detail st");
		let entState = GetEntityState(sel);
		//warn("sel detail en");
		if (!entState)
			continue;
		entStates.push(entState);
	}
	
	let formationEntities = Engine.GetGUIObjectByName("formationEntityPanel");
	if (entStates.length == 0)
	{
		Engine.GetGUIObjectByName("detailsAreaMultiple").hidden = true;
		Engine.GetGUIObjectByName("detailsAreaSingle").hidden = true;
		Engine.GetGUIObjectByName("selectionFormation").hidden = true;
		hideUnitCommands();

		supplementalDetailsPanel.hidden = true;
		detailsPanel.hidden = true;
		commandsPanel.hidden = true;
		formationEntities.hidden = false;
		return;
	}
	formationEntities.hidden = true;
	
	let hasFormation = false;
	let formation = null;
	let fState = null;

	for (let entState of entStates) {
		if(!entState.unitAI)
			continue;
		if(!entState.unitAI.formationController) {
			hasFormation = false;
			break;
		}
		if(!formation){
			formation = entState.unitAI.formationController;
			hasFormation = true;
			continue;
		}
		if(formation != entState.unitAI.formationController)
			hasFormation = false;
	}

	if (hasFormation) {
		//warn(formation + ": selDetail fState st");
		fState = GetEntityState(formation);
		//warn("selDetail fState en");
		supplementalDetailsPanel.hidden = true;
		detailsPanel.hidden = true;
		commandsPanel.hidden = true;
		hideUnitCommands();
		updateFormationCommands(entStates, supplementalDetailsPanel, commandsPanel);
		displayFormation(entStates, fState);	
	}
	// Fill out general info and display it
	else if(entStates.length == 1)
		displaySingle(entStates[0]);
	else
		displayMultiple(entStates);

	// Fill out commands panel for specific unit selected (or first unit of primary group)
	if (!hasFormation) {	
		// Show basic details.
		detailsPanel.hidden = false;
		updateUnitCommands(entStates, supplementalDetailsPanel, commandsPanel);
		// Show health bar for garrisoned units if the garrison panel is visible
		if (Engine.GetGUIObjectByName("unitGarrisonPanel") && !Engine.GetGUIObjectByName("unitGarrisonPanel").hidden)
			updateGarrisonHealthBar(entStates[0], g_Selection.toList());
	}
}

function tradingGainString(gain, owner)
{
	// Translation: Used in the trading gain tooltip
	return sprintf(translate("%(gain)s (%(player)s)"), {
		"gain": gain,
		"player": GetSimState().players[owner].name
	});
}

/**
 * Returns a message with the details of the trade gain.
 */
function getTradingTooltip(gain)
{
	if (!gain)
		return "";

	let markets = [
		{ "gain": gain.market1Gain, "owner": gain.market1Owner },
		{ "gain": gain.market2Gain, "owner": gain.market2Owner }
	];

	let primaryGain = gain.traderGain;

	for (let market of markets)
		if (market.gain && market.owner == gain.traderOwner)
			// Translation: Used in the trading gain tooltip to concatenate profits of different players
			primaryGain += translate("+") + market.gain;

	let tooltip = tradingGainString(primaryGain, gain.traderOwner);

	for (let market of markets)
		if (market.gain && market.owner != gain.traderOwner)
			tooltip +=
				translateWithContext("Separation mark in an enumeration", ", ") +
				tradingGainString(market.gain, market.owner);

	return tooltip;
}
