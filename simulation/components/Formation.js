function Formation() {}

Formation.prototype.Schema =
	"<element name='FormationName' a:help='Name of the formation'>" +
		"<text/>" +
	"</element>" +
	"<optional><element name='CanCharge'><text/></element></optional>"+
	"<element name='Icon'>" +
		"<text/>" +
	"</element>" +
	"<element name='RequiredMemberCount' a:help='Minimum number of entities the formation should contain'>" +
		"<data type='nonNegativeInteger'/>" +
	"</element>" +
	"<element name='MaxMemberCount' a:help='Maximum number of entities in the formation'>" +
		"<data type='nonNegativeInteger'/>" +
	"</element>" +
	"<element name='DisabledTooltip' a:help='Tooltip shown when the formation is disabled'>" +
		"<text/>" +
	"</element>" +
	"<element name='SpeedMultiplier' a:help='The speed of the formation is determined by the minimum speed of all members, multiplied with this number.'>" +
		"<ref name='nonNegativeDecimal'/>" +
	"</element>" +
	"<element name='FormationShape' a:help='Formation shape, currently supported are square, triangle and special, where special will be defined in the source code.'>" +
		"<text/>" +
	"</element>" +
	"<element name='ShiftRows' a:help='Set the value to true to shift subsequent rows'>" +
		"<text/>" +
	"</element>" +
	"<element name='SortingClasses' a:help='Classes will be added to the formation in this order. Where the classes will be added first depends on the formation'>" +
		"<text/>" +
	"</element>" +
	"<optional>" +
		"<element name='SortingOrder' a:help='The order of sorting. This defaults to an order where the formation is filled from the first row to the last, and the center of each row to the sides. Other possible sort orders are \"fillFromTheSides\", where the most important units are on the sides of each row, and \"fillToTheCenter\", where the most vulerable units are right in the center of the formation. '>" +
			"<text/>" +
		"</element>" +
	"</optional>" +
	"<element name='WidthDepthRatio' a:help='Average width/depth, counted in number of units.'>" +
		"<ref name='nonNegativeDecimal'/>" +
	"</element>" +
	"<element name='Sloppyness' a:help='Sloppyness in meters (the max difference between the actual and the perfectly aligned formation position'>" +
		"<ref name='nonNegativeDecimal'/>" +
	"</element>" +
	"<optional>" +
		"<element name='MinColumns' a:help='When possible, this number of colums will be created. Overriding the wanted width depth ratio'>" +
			"<data type='nonNegativeInteger'/>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='MaxColumns' a:help='When possible within the number of units, and the maximum number of rows, this will be the maximum number of columns.'>" +
			"<data type='nonNegativeInteger'/>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='MaxRows' a:help='The maximum number of rows in the formation'>" +
			"<data type='nonNegativeInteger'/>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='CenterGap' a:help='The size of the central gap, expressed in number of units wide'>" +
			"<ref name='nonNegativeDecimal'/>" +
		"</element>" +
	"</optional>" +
	"<element name='UnitSeparationWidthMultiplier' a:help='Place the units in the formation closer or further to each other. The standard separation is the footprint size.'>" +
		"<ref name='nonNegativeDecimal'/>" +
	"</element>" +
	"<element name='UnitSeparationDepthMultiplier' a:help='Place the units in the formation closer or further to each other. The standard separation is the footprint size.'>" +
		"<ref name='nonNegativeDecimal'/>" +
	"</element>" +
	"<element name='Animations' a:help='Give a list of animations to use for the particular formation members, based on their positions'>" +
		"<zeroOrMore>" +
			"<element a:help='The name of the default animation (walk, idle, attack_ranged...) that will be transformed in the formation-specific ResetMoveAnimation'>" +
				"<anyName/>" +
				"<text a:help='example text: \"1..1,1..-1:animation1;2..2,1..-1;animation2\", this will set animation1 for the first row, and animation2 for the second row. The first part of the numbers (1..1 and 2..2) means the row range. Every row between (and including) those values will switch animations. The second part of the numbers (1..-1) denote the columns inside those rows that will be affected. Note that in both cases, you can use -1 for the last row/column, -2 for the second to last, etc.'/>" +
			"</element>" +
		"</zeroOrMore>" +
	"</element>";

var g_ColumnDistanceThreshold = 128; // distance at which we'll switch between column/box formations

Formation.prototype.Init = function()
{
	this.canCharge = this.template.CanCharge && this.template.CanCharge == "true";
	this.formationShape = this.template.FormationShape;
	this.sortingClasses = this.template.SortingClasses.split(/\s+/g);
	this.sortingOrder = this.template.SortingOrder;
	this.shiftRows = this.template.ShiftRows == "true";
	this.separationMultiplier = {
		"width": +this.template.UnitSeparationWidthMultiplier,
		"depth": +this.template.UnitSeparationDepthMultiplier
	};
	this.sloppyness = +this.template.Sloppyness;
	this.widthDepthRatio = +this.template.WidthDepthRatio;
	this.minColumns = +(this.template.MinColumns || 0);
	this.maxColumns = +(this.template.MaxColumns || 0);
	this.maxRows = +(this.template.MaxRows || 0);
	this.centerGap = +(this.template.CenterGap || 0);
	this.useAvgRot = false;

	var animations = this.template.Animations;
	this.animations = {};
	this.speed = 0;
	for (let animationName in animations)
	{
		let differentAnimations = animations[animationName].split(/\s*;\s*/);
		this.animations[animationName] = [];
		// loop over the different rectangulars that will map to different animations
		for (let rectAnimation of differentAnimations)
		{
			let rect, replacementAnimationName;
			[rect, replacementAnimationName] = rectAnimation.split(/\s*:\s*/);
			let rows, columns;
			[rows, columns] = rect.split(/\s*,\s*/);
			let minRow, maxRow, minColumn, maxColumn;
			[minRow, maxRow] = rows.split(/\s*\.\.\s*/);
			[minColumn, maxColumn] = columns.split(/\s*\.\.\s*/);
			this.animations[animationName].push({
				"minRow": +minRow,
				"maxRow": +maxRow,
				"minColumn": +minColumn,
				"maxColumn": +maxColumn,
				"animation": replacementAnimationName
			});
		}
	}

	this.members = []; // entity IDs currently belonging to this formation
	this.memberPositions = [];
	this.maxRowsUsed = 0;
	this.maxColumnsUsed = [];
	this.inPosition = []; // entities that have reached their final position
	this.columnar = false; // whether we're travelling in column (vs box) formation
	this.rearrange = true; // whether we should rearrange all formation members
	this.formationMembersWithAura = []; // Members with a formation aura
	this.width = 0;
	this.depth = 0;
	this.max = {"x": 0, "y": 0};
	this.min = {"x": 0, "y": 0};
	this.oldOrientation = {"sin": 0, "cos": 0};
	this.twinFormations = [];
	// distance from which two twin formations will merge into one.
	this.formationSeparation = 0;
	Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer)
		.SetInterval(this.entity, IID_Formation, "ShapeUpdate", 1000, 1000, null);
};

/**
 * Set the value from which two twin formations will become one.
 */
Formation.prototype.SetFormationSeparation = function(value)
{
	this.formationSeparation = value;
};

Formation.prototype.GetSloppyness = function()
{
	return this.sloppyness;
}

Formation.prototype.CanCharge = function(target)
{
	if (!this.canCharge) {
//		warn("Formation cannot charge at all");
		return false;
	}
	if (!target) {
//		warn("Formation has not target to charge");
		return false;
	}

	let myOwner = Engine.QueryInterface(this.entity, IID_Ownership).GetOwner();
	let targetOwner = Engine.QueryInterface(target, IID_Ownership).GetOwner();

	if (myOwner == targetOwner)
		return false;

	let cmpIdentity = Engine.QueryInterface(target, IID_Identity);
	if (!cmpIdentity) {
//		warn("target has not identity");
		return false;
	}
	let cmpPosition = Engine.QueryInterface(target, IID_Position);
	if (!cmpPosition || !cmpPosition.IsInWorld()) {
//		warn("target has not position");
		return false;
	}
	let cmpUnitAI = Engine.QueryInterface(target, IID_UnitAI);
	if (!cmpUnitAI) {
//		warn("target has not AI");
		return false;
	}
	// just for start do no allow to charge into formation
	if (cmpUnitAI.IsFormationController()) {
//		warn("target is formation: disabled for now");
		return false;
	}
	if (cmpUnitAI.IsFormationMember()){
//		warn("target is formation member: disabled for now");
		return true;
	}
	// just for start do no allow to charge into formation
	if (cmpIdentity.HasClass("Organic")) {
//		warn("CAN CHARGE");
		return true;
	}
//	warn("not organic");
	return false;
}

Formation.prototype.GetSize = function()
{
	return {"width": this.width, "depth": this.depth};
};

Formation.prototype.GetSpeedMultiplier = function()
{
	return +this.template.SpeedMultiplier;
};

Formation.prototype.GetMemberCount = function()
{
	return this.members.length;
};

Formation.prototype.GetMaxMembers = function()
{
	return +this.template.MaxMemberCount;
}

Formation.prototype.GetMembers = function()
{
	return this.members;
};

Formation.prototype.GetName = function()
{
	return this.template.FormationName;
}

Formation.prototype.Spread = function(offsets, spreadRatioX = 1.5, spreadRatioY = 1.5)
{
	let newOff = [];

	for (let off of offsets)
	{
		off.x = off.x *spreadRatioX;
		off.y = off.y *spreadRatioY;
		newOff.push(off);
	}

	return newOff;
}

Formation.prototype.GetClosestMember = function(ent, filter)
{
	let cmpEntPosition = Engine.QueryInterface(ent, IID_Position);
	if (!cmpEntPosition || !cmpEntPosition.IsInWorld())
		return INVALID_ENTITY;

	let entPosition = cmpEntPosition.GetPosition2D();
	let closestMember = INVALID_ENTITY;
	let closestDistance = Infinity;
	for (let member of this.members)
	{
		if (filter && !filter(ent))
			continue;

		let cmpPosition = Engine.QueryInterface(member, IID_Position);
		if (!cmpPosition || !cmpPosition.IsInWorld())
			continue;

		let pos = cmpPosition.GetPosition2D();
		let dist = entPosition.distanceToSquared(pos);
		if (dist < closestDistance)
		{
			closestMember = member;
			closestDistance = dist;
		}
	}
	return closestMember;
};

/**
 * Returns the 'primary' member of this formation (typically the most
 * important unit type), for e.g. playing a representative sound.
 * Returns undefined if no members.
 * TODO: actually implement something like that; currently this just returns
 * the arbitrary first one.
 */
Formation.prototype.GetPrimaryMember = function()
{
	return this.members[0];
};

Formation.prototype.GetMemberOffset = function(entity)
{
	let offset = {"x": 0, "z": 0};
	offset.x = this.memberPositions[entity].x;
	offset.z = this.memberPositions[entity].y;
	return offset;
}

Formation.prototype.GetDefaultFollowTarget = function(entity)
{
//	warn("default follow target of " + entity + "from pos " + this.memberPositions[entity].row + "x" + this.memberPositions[entity].column  + " is on offset " + this.memberPositions[entity].follow);
	let follow = this.memberPositions[entity].follow;
	if (follow == -1)
		return undefined;
//	warn("default entity to follow for " + entity  + " is " + this.offsets[follow].ent);
	return this.offsets[follow].ent;
}

Formation.prototype.FillPositions = function(ents)
{
	if (!this.offsets)
		return;

	let movedEnts = ents;
	let friedOffs = [];
	let freeOffsets = [];
	for (let ent of movedEnts) {
//		warn("removed " +ent +" from "  +this.memberPositions[ent].offset + " on " +  this.memberPositions[ent].row + "x" + this.memberPositions[ent].column);
		let off = this.memberPositions[ent].offset;
		if (!!this.offsets[off])
			freeOffsets.push(off);
	}
	while (freeOffsets.length) {
		for ( let off of freeOffsets) {
			let oRow = this.offsets[off].row;
			let oColumn = this.offsets[off].column;
			for ( let stEnt of this.members ) {
				let fRow = this.memberPositions[stEnt].fRow;
				let fColumn = this.memberPositions[stEnt].fColumn;
				let nfo = this.memberPositions[stEnt].offset;
				if (fRow == -1 || fColumn == -1)
					continue;
				if (fRow != oRow || fColumn != oColumn)
					continue;
				this.MoveMemberToFreePosition(stEnt, off);
				friedOffs.push(nfo);
				break;
			}
		}
		freeOffsets = [];
		for (let off of friedOffs) {
			freeOffsets.push(off);
		}
		friedOffs = [];
	}
}

Formation.prototype.MoveMemberToFreePosition = function(member, offsetId)
{
	let oldId = this.memberPositions[member].offset;
	let newOffset = this.offsets[offsetId];

	let data = 
	{
		"target": this.entity,
		"x": newOffset.x,
		"z": newOffset.y,
		"force": true
	};

//	warn(this.offsets[oldId].row + "x" + this.offsets[oldId].column + " -> " + newOffset.row + "x" + newOffset.column);

	let cmpUnitAI = Engine.QueryInterface(member, IID_UnitAI);
	cmpUnitAI.AddOrder("FormationWalk", data, true);
	this.offsets[offsetId].ent = member;
	this.offsets[oldId].ent = undefined;
	this.memberPositions[member].offset = offsetId;
	this.memberPositions[member].x = newOffset.x;
	this.memberPositions[member].y = newOffset.y;
	this.memberPositions[member].row = newOffset.row;
	this.memberPositions[member].column = newOffset.column;
	this.memberPositions[member].follow = newOffset.follow;
	this.memberPositions[member].fRow = newOffset.fRow;
	this.memberPositions[member].fColumm = newOffset.fColumm;
}

Formation.prototype.IsFirstRow = function(entity)
{
	if (!entity)
		return false;
	if (!this.memberPositions)
		return false;
	if (!this.memberPositions[entity])
		return false;
	return this.memberPositions[entity].row == 1;
}
/*
Formation.prototype.step = function(dirSin, dirCos)
{
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	let cmpUnitAI = Engine.QueryInterface(this.entity, IID_UnitAI);
	let cmpUnitMotion = Engine.QueryInterface(this.entity, IID_UnitMotion);
	let rot  = cmpPosition.GetRotation().y;
	let pos = cmpPosition.GetPosition();
	let distMultiplier = 3.0;
	let x = pos.x + ((Math.sin(rot))*distMultiplier);
	let y = pos.z + ((Math.cos(rot))*distMultiplier);
	cmpUnitAI.Walk(x, y);
	this.inPosition = [];
}
*/
Formation.prototype.CanLeavePosition = function(entity)
{
	if (!entity)
		return false;
	if (!this.memberPositions)
		return false;
	if (!this.memberPositions[entity])
		return false;
	if (this.memberPositions[entity].column > 2)
		return false;
	if (this.memberPositions[entity].row == 1)
		return true;

	return false;
}

/**
 * Get the formation animation for a certain member of this formation
 * @param entity The entity ID to get the animation for
 * @param defaultAnimation The name of the default wanted animation for the entity
 * E.g. "walk", "idle" ...
 * @return The name of the transformed animation as defined in the template
 * E.g. "walk_testudo_row1"
 */
Formation.prototype.GetFormationAnimation = function(entity, defaultAnimation)
{
	let animationGroup = this.animations[defaultAnimation];
	if (!animationGroup || this.columnar || !this.memberPositions[entity])
		return defaultAnimation;
	let row = this.memberPositions[entity].row;
	let column = this.memberPositions[entity].column;
	for (let i = 0; i < animationGroup.length; ++i)
	{
		let minRow = animationGroup[i].minRow;
		if (minRow < 0)
			minRow += this.maxRowsUsed + 1;
		if (row < minRow)
			continue;

		let maxRow = animationGroup[i].maxRow;
		if (maxRow < 0)
			maxRow += this.maxRowsUsed + 1;
		if (row > maxRow)
			continue;

		let minColumn = animationGroup[i].minColumn;
		if (minColumn < 0)
			minColumn += this.maxColumnsUsed[row] + 1;
		if (column < minColumn)
			continue;

		let maxColumn = animationGroup[i].maxColumn;
		if (maxColumn < 0)
			maxColumn += this.maxColumnsUsed[row] + 1;
		if (column > maxColumn)
			continue;

		return animationGroup[i].animation;
	}
	return defaultAnimation;
};

/**
 * Permits formation members to register that they've reached their destination.
 */
Formation.prototype.SetInPosition = function(ent)
{
	if (this.inPosition.indexOf(ent) != -1)
		return;

	// Rotate the entity to the right angle
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	let cmpEntPosition = Engine.QueryInterface(ent, IID_Position);

	if (cmpEntPosition && cmpEntPosition.IsInWorld() && cmpPosition && cmpPosition.IsInWorld()) {
	//	warn("Formation.SetInPosition entity " + ent +" turn to " + cmpPosition.GetRotation().y);
		cmpEntPosition.TurnTo(cmpPosition.GetRotation().y);
	}

	this.inPosition.push(ent);
};

/**
 * Called by formation members upon entering non-walking states.
 */
Formation.prototype.UnsetInPosition = function(ent)
{
	let ind = this.inPosition.indexOf(ent);
	if (ind != -1)
		this.inPosition.splice(ind, 1);
};

/**
 * Set whether we should rearrange formation members if
 * units are removed from the formation.
 */
Formation.prototype.SetRearrange = function(rearrange)
{
	this.rearrange = rearrange;
};

Formation.prototype.InheritOffsets = function(offsets)
{
	this.offsets = offsets;
}
Formation.prototype.InheritMembers = function(memberPositions)
{
	this.memberPositions = memberPositions;
}
/**
 * Initialise the members of this formation.
 * Must only be called once.
 * All members must implement UnitAI.
 */
Formation.prototype.SetMembers = function(ents)
{
	if (ents.length > this.template.MaxMemberCount) {
		for (let ent of ents) {
			this.members.push(ent);
			if (this.members.length == this.template.MaxMemberCount)
				break;
		}
	}
	else
		this.members = ents;

	for (let ent of this.members)
	{
		let cmpUnitAI = Engine.QueryInterface(ent, IID_UnitAI);
		cmpUnitAI.SetFormationController(this.entity);

		let cmpAuras = Engine.QueryInterface(ent, IID_Auras);
		if (cmpAuras && cmpAuras.HasFormationAura())
		{
			this.formationMembersWithAura.push(ent);
			cmpAuras.ApplyFormationBonus(this.members);
		}
	}

	let cmpAura = Engine.QueryInterface(this.entity, IID_Auras);
	if(cmpAura && cmpAura.HasFormationAura()){
		cmpAura.ApplyFormationBonus(this.members);
	}

	//	this.offsets = undefined;
	// Locate this formation controller in the middle of its members
	this.MoveToMembersCenter();

	// Compute the speed etc. of the formation
	this.ComputeMotionParameters();
	let cmpAttack = Engine.QueryInterface(this.entity, IID_Attack);
	if(cmpAttack)
		cmpAttack.recalculateRange();
	this.useAvgRot = true;
/*
	let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
	if (!cmpVisual)
		return;

	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	let player = cmpOwnership.GetOwner();
	let civ = QueryPlayerIDInterface(player).GetCiv();
	cmpVisual.SetVariant("animationVariant", civ);
*/
};

Formation.prototype.Died = function(ents)
{
	this.FillPositions(ents);
}

/**
 * Remove the given list of entities.
 * The entities must already be members of this formation.
 */
Formation.prototype.RemoveMembers = function(ents)
{
//	this.offsets = undefined;
	this.members = this.members.filter(function(e) { return ents.indexOf(e) == -1; });
	this.inPosition = this.inPosition.filter(function(e) { return ents.indexOf(e) == -1; });
	let died = [];

	for (let ent of ents)
	{
		let cmpUnitAI = Engine.QueryInterface(ent, IID_UnitAI);
		cmpUnitAI.UpdateWorkOrders();
		cmpUnitAI.SetFormationController(INVALID_ENTITY);
		let cmpHealth = Engine.QueryInterface(ent, IID_Health);
		if (!cmpHealth)
			died.push(ent);
		else if (cmpHealth.GetHitpoints() <= 0)
			died.push(ent);
	}

	for (let ent of this.formationMembersWithAura)
	{
		let cmpAuras = Engine.QueryInterface(ent, IID_Auras);
		cmpAuras.RemoveFormationBonus(ents);

		// the unit with the aura is also removed from the formation
		if (ents.indexOf(ent) !== -1)
			cmpAuras.RemoveFormationBonus(this.members);
	}

	let cmpAura = Engine.QueryInterface(this.entity, IID_Auras);
	if(cmpAura && cmpAura.HasFormationAura()){
		cmpAura.RemoveFormationBonus(ents);
	}

	this.formationMembersWithAura = this.formationMembersWithAura.filter(function(e) { return ents.indexOf(e) == -1; });

	if (this.members.length < this.template.RequiredMemberCount)
	{
		this.Disband();
		return;
	}

	let cmpAttack = Engine.QueryInterface(this.entity, IID_Attack);
	if(cmpAttack)
		cmpAttack.recalculateRange();

	if (!this.rearrange) {
		this.Died(died);
		return;
	}

	this.ComputeMotionParameters();

	// Rearrange the remaining members
	this.MoveMembersIntoFormation(true, true);
};

Formation.prototype.AddMembers = function(ents)
{
	this.offsets = undefined;
	this.inPosition = [];

	if (this.members.length == this.template.MaxMemberCount)
		return;

	let newMembers = [];
	if (this.members.length + ents.length > this.template.MaxMemberCount) {
		for (let ent of ents) {
			this.members.push(ent);
			newMembers.push(ent);
			if (this.members.length == this.template.MaxMemberCount)
				break;
		}
	} else {
		this.members = this.members.concat(ents);
		newMembers = ents;
	}

	for (let ent of this.formationMembersWithAura)
	{
		let cmpAuras = Engine.QueryInterface(ent, IID_Auras);
		cmpAuras.ApplyFormationBonus(newMembers);
	}

	for (let ent of newMembers)
	{
		let cmpUnitAI = Engine.QueryInterface(ent, IID_UnitAI);
		cmpUnitAI.SetFormationController(this.entity);

		let cmpAuras = Engine.QueryInterface(ent, IID_Auras);
		if (cmpAuras && cmpAuras.HasFormationAura())
		{
			this.formationMembersWithAura.push(ent);
			cmpAuras.ApplyFormationBonus(this.members);
		}
	}

	let cmpAura = Engine.QueryInterface(this.entity, IID_Auras);
	if(cmpAura && cmpAura.HasFormationAura()){
		cmpAura.ApplyFormationBonus(newMembers);
	}

	let cmpAttack = Engine.QueryInterface(this.entity, IID_Attack);
	if(cmpAttack)
		cmpAttack.recalculateRange();

	this.useAvgRot = true;
	this.MoveMembersIntoFormation(true, true);
};

/**
 * Called when the formation stops moving in order to detect
 * units that have already reached their final positions.
 */
Formation.prototype.FindInPosition = function()
{
	for (let i = 0; i < this.members.length; ++i)
	{
		let cmpUnitMotion = Engine.QueryInterface(this.members[i], IID_UnitMotion);
		if (!cmpUnitMotion.IsMoving())
		{
			// Verify that members are stopped in FORMATIONMEMBER.WALKING
			let cmpUnitAI = Engine.QueryInterface(this.members[i], IID_UnitAI);
			if (cmpUnitAI.IsWalking())
				this.SetInPosition(this.members[i]);
		}
	}
};

/**
 * Remove all members and destroy the formation.
 */
Formation.prototype.Disband = function()
{  
	for (let ent of this.members)
	{
		let cmpUnitAI = Engine.QueryInterface(ent, IID_UnitAI);
		cmpUnitAI.SetFormationController(INVALID_ENTITY);
	}

	for (let ent of this.formationMembersWithAura)
	{
		let cmpAuras = Engine.QueryInterface(ent, IID_Auras);
		cmpAuras.RemoveFormationBonus(this.members);
	}

	let cmpAura = Engine.QueryInterface(this.entity, IID_Auras);
	if(cmpAura && cmpAura.HasFormationAura()){
		cmpAura.RemoveFormationBonus(this.members);
	}


	this.members = [];
	this.inPosition = [];
	this.formationMembersWithAura = [];
	this.offsets = undefined;

	Engine.DestroyEntity(this.entity);
};

/**
 * Set all members to form up into the formation shape.
 * If moveCenter is true, the formation center will be reinitialised
 * to the center of the units.
 * If force is true, all individual orders of the formation units are replaced,
 * otherwise the order to walk into formation is just pushed to the front.
 */
Formation.prototype.MoveMembersIntoFormation = function(moveCenter, force)
{
	if (!this.members.length)
		return;

	let active = [];
	let positions = [];
	let rotations = [];
	let avgrot = 0;

	for (let ent of this.members)
	{
		let cmpPosition = Engine.QueryInterface(ent, IID_Position);
		if (!cmpPosition || !cmpPosition.IsInWorld())
			continue;

		active.push(ent);
		// query the 2D position as exact hight calculation isn't needed
		// but bring the position to the right coordinates
		let pos = cmpPosition.GetPosition2D();
		let rot = cmpPosition.GetRotation().y;
		rotations.push(rot);
		avgrot = avgrot + rot;
		positions.push(pos);
	}

	let avgpos = Vector2D.average(positions);

	// Reposition the formation if we're told to or if we don't already have a position
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (this.useAvgRot && rotations.length) {
		avgrot = avgrot / rotations.length;
		cmpPosition.TurnTo(avgrot);
		this.useAvgRot = false;
	}
	let inWorld = cmpPosition.IsInWorld();
	if (moveCenter || !inWorld)
	{
		cmpPosition.JumpTo(avgpos.x, avgpos.y);
		// Don't make the formation controller entity show up in range queries
		if (!inWorld)
		{
			let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
			cmpRangeManager.SetEntityFlag(this.entity, "normal", false);
		}
	}

	// Switch between column and box if necessary
	if (!this.canCharge) {
		let cmpUnitAI = Engine.QueryInterface(this.entity, IID_UnitAI);
		let walkingDistance = cmpUnitAI.ComputeWalkingDistance();
		let columnar = walkingDistance > g_ColumnDistanceThreshold;
		if (columnar != this.columnar)
		{
			this.columnar = columnar;
			this.offsets = undefined;
		}
	}

	let newOrientation = this.GetEstimatedOrientation(avgpos);
	let dSin = Math.abs(newOrientation.sin - this.oldOrientation.sin);
	let dCos = Math.abs(newOrientation.cos - this.oldOrientation.cos);
	// If the formation existed, only recalculate positions if the turning agle is somewhat biggish
	if (!this.offsets || dSin > 1 || dCos > 1)
		this.offsets = this.ComputeFormationOffsets(active, positions);

	this.oldOrientation = newOrientation;

	let xMax = 0;
	let yMax = 0;
	let xMin = 0;
	let yMin = 0;

	for (let i = 0; i < this.offsets.length; ++i)
	{
		let offset = this.offsets[i];
		if (!offset.ent)
			continue;
		let cmpUnitAI = Engine.QueryInterface(offset.ent, IID_UnitAI);
		if (!cmpUnitAI)
			continue;

		let data =
		{
			"target": this.entity,
			"x": offset.x,
			"z": offset.y
		};
		cmpUnitAI.AddOrder("FormationWalk", data, !force);
		this.memberPositions[offset.ent].offset = i;
		this.memberPositions[offset.ent].x = offset.x;
		this.memberPositions[offset.ent].y = offset.y;
		this.memberPositions[offset.ent].fRow = offset.fRow;
		this.memberPositions[offset.ent].fColumn = offset.fColumn;
//		warn(offset.ent + ": -> " + i  + " on " + offset.row + "x" + offset.column + " --> " + this.memberPositions[offset.ent].fRow + "x" + this.memberPositions[offset.ent].fColumn);
		xMax = Math.max(xMax, offset.x);
		yMax = Math.max(yMax, offset.y);
		xMin = Math.min(xMin, offset.x);
		yMin = Math.min(yMin, offset.y);
	}
	this.width = xMax - xMin;
	this.depth = yMax - yMin;
	this.max.x = xMax;
	this.max.y = yMax;
	this.min.x = xMin;
	this.min.y = yMin; 
//	warn(this.width + " x " + this.depth + ": " + xMin + ", " + xMax + " -- " + yMin + ", " + yMax);
	this.inPosition = [];
};
/*
Formation.prototype.IsInFormationShape = function(pos, bonus = 0)
{
	if (!pos)
		return false;

	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition)
		return false;
	let position = cmpPosition.GetPosition();
	let rotation = cmpPosition.GetRotation();

	let maxX = this.max.x + bonus;
	let minX = this.min.x - bonus;
	let maxY = this.max.y + bonus;
	let minY = this.min.y - bonus;

	let convertedPosition = this.ConvertPositionToFormationWorld(pos, position, rotation);

	if ( convertedPosition.x <= minX || convertedPosition.x >= maxX || convertedPosition.y <= minY || convertedPosition.y >= maxY)
		return false;

//	warn ("converted position: " + convertedPosition.x + " x " + convertedPosition.y + " in zone " + minX + " -> " + maxX + " and " + minY + " -> " + maxY);
	return true;
}

Formation.prototype.ConvertPositionToFormationWorld = function(o, pos, rotation)
{
	let rot = rotation.y;
	let sin = Math.sin(360 - rot);
	let cos = Math.cos(360 - rot);
//	let oX = pos.x + o.y * sin + o.x * cos;
//	let oY = pos.y + o.y * cos - o.x * sin;
	let rotX = o.x - pos.x;
	let rotY = o.y - pos.y;
	let x = rotY * sin + rotX * cos;
	let y = rotY * cos - rotX * sin;
	let position = new Vector2D(rotX, rotY);
	return position;
}
*/
Formation.prototype.GetShape = function()
{
	let shape = {"width": this.width, "depth": this.depth, "form": {}};
	shape.form.max = {};
	shape.form.min = {};
	shape.form.max.x = this.max.x;
	shape.form.max.y = this.max.y;
	shape.form.min.x = this.min.x;
	shape.form.min.y = this.min.y;
	return shape;
}

Formation.prototype.RotateToPoint = function(x, z)
{
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	let angle = cmpPosition.GetRotation().y;
	let targetPos = {"x": x, "y": z};
	angle = cmpPosition.GetPosition2D().angleTo(targetPos);
	cmpPosition.TurnTo(angle);
//	warn ( "Formation turns to: " + angle);
	this.MoveMembersIntoFormation();
	this.inPosition = [];
}

Formation.prototype.MoveToMembersCenter = function()
{
	let positions = [];

	for (let ent of this.members)
	{
		let cmpPosition = Engine.QueryInterface(ent, IID_Position);
		if (!cmpPosition || !cmpPosition.IsInWorld())
			continue;

		positions.push(cmpPosition.GetPosition2D());
	}

	let avgpos = Vector2D.average(positions);

	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	let inWorld = cmpPosition.IsInWorld();
	cmpPosition.JumpTo(avgpos.x, avgpos.y);

	// Don't make the formation controller show up in range queries
	if (!inWorld)
	{
		let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
		cmpRangeManager.SetEntityFlag(this.entity, "normal", false);
	}
};

Formation.prototype.GetAvgFootprint = function(active)
{
	var footprints = [];
	for (var ent of active)
	{
		var cmpFootprint = Engine.QueryInterface(ent, IID_Footprint);
		if (cmpFootprint)
			footprints.push(cmpFootprint.GetShape());
	}
	if (!footprints.length)
		return {"width":1, "depth": 1};

	var r = {"width": 0, "depth": 0};
	for (var shape of footprints)
	{
		if (shape.type == "circle")
		{
			r.width += shape.radius * 2;
			r.depth += shape.radius * 2;
		}
		else if (shape.type == "square")
		{
			r.width += shape.width;
			r.depth += shape.depth;
		}
	}
	r.width /= footprints.length;
	r.depth /= footprints.length;
	return r;
};

Formation.prototype.ComputeFormationOffsets = function(active, positions)
{
//	warn("new offsets");
	var separation = this.GetAvgFootprint(active);
	separation.width *= this.separationMultiplier.width;
	separation.depth *= this.separationMultiplier.depth;

	if (this.columnar)
		var sortingClasses = ["Cavalry","Infantry"];
	else
		var sortingClasses = this.sortingClasses.slice();
	sortingClasses.push("Unknown");

	// the entities will be assigned to positions in the formation in
	// the same order as the types list is ordered
	var types = {};
	for (var i = 0; i < sortingClasses.length; ++i)
		types[sortingClasses[i]] = [];

	for (var i in active)
	{
		var cmpIdentity = Engine.QueryInterface(active[i], IID_Identity);
		var classes = cmpIdentity.GetClassesList();
		var done = false;
		for (var c = 0; c < sortingClasses.length; ++c)
		{
			if (classes.indexOf(sortingClasses[c]) > -1)
			{
				types[sortingClasses[c]].push({"ent": active[i], "pos": positions[i]});
				done = true;
				break;
			}
		}
		if (!done)
			types["Unknown"].push({"ent": active[i], "pos": positions[i]});
	}

	var count = active.length;

	var shape = this.formationShape;
	var shiftRows = this.shiftRows;
	var centerGap = this.centerGap;
	var sortingOrder = this.sortingOrder;

	var offsets = [];

	// Choose a sensible size/shape for the various formations, depending on number of units
	var cols;

	if (this.columnar)
	{
		shape = "square";
		cols = Math.min(count,3);
		shiftRows = false;
		centerGap = 0;
		sortingOrder = null;
	}
	else
	{
		var depth = Math.sqrt(count / this.widthDepthRatio);
		if (this.maxRows && depth > this.maxRows)
			depth = this.maxRows;
		cols = Math.ceil(count / Math.ceil(depth) + (this.shiftRows ? 0.5 : 0));
		if (cols < this.minColumns)
			cols = Math.min(count, this.minColumns);
		if (this.maxColumns && cols > this.maxColumns && this.maxRows != depth)
			cols = this.maxColumns;
	}

	// define special formations here
	if (this.template.FormationName == "Scatter")
	{
		var width = Math.sqrt(count) * (separation.width + separation.depth) * 2.5;

		for (var i = 0; i < count; ++i)
		{
			var obj = new Vector2D(randFloat(0, width), randFloat(0, width));
			obj.row = 1;
			obj.column = i + 1;
			offsets.push(obj);
		}
	}

	// For non-special formations, calculate the positions based on the number of entities
	this.maxColumnsUsed = [];
	this.maxRowsUsed = 0;
	if (shape != "special")
	{
		offsets = [];
		var r = 0;
		var left = count;
		let lastMiddle = 0;
		// while there are units left, start a new row in the formation
		while (left > 0)
		{
			// save the position of the row
			var z = -r * separation.depth;
			// switch between the left and right side of the center to have a symmetrical distribution
			var side = 1;
			// determine the number of entities in this row of the formation
			if (shape == "square")
			{
				var n = cols;
				if (shiftRows)
					n -= r%2;
			}
			else if (shape == "triangle")
			{
				if (shiftRows)
					var n = r + 1;
				else
					var n = r * 2 + 1;
			}
			if (!shiftRows && n > left)
				n = left;
			let lm = lastMiddle;
			for (var c = 0; c < n && left > 0; ++c)
			{
				// switch sides for the next entity
				side *= -1;
				if (n%2 == 0)
					var x = side * (Math.floor(c/2) + 0.5) * separation.width;
				else
					var x = side * Math.ceil(c/2) * separation.width;
				if (centerGap)
				{
					if (x == 0) // don't use the center position with a center gap
						continue;
					x += side * centerGap / 2;
				}
				var column = Math.ceil(n/2) + Math.ceil(c/2) * side;
				var r1 = randFloat(-1, 1) * this.sloppyness;
				var r2 = randFloat(-1, 1) * this.sloppyness;

				offsets.push(new Vector2D(x + r1, z + r2));
				offsets[offsets.length - 1].row = r + 1;
				offsets[offsets.length - 1].column = column;
				let iOff = offsets.length - 1;
				let follow = iOff - 1;
				let middle = Math.ceil(n/2);

				if (column == middle)
					lm = iOff;
				if ( r + 1 == 1 ) {
					if ( column == middle )
						follow = -1;
					else if (column == middle + 1 || column == middle - 1)
						follow = 0;
					else {
						if (side == 1)
							follow = iOff - 2; 
						else 
							follow = iOff - 2; 
					}
				} else {
					if (side == 1)
						follow = lastMiddle + Math.ceil(c/2)*2 - 1; 
					else 
						follow = lastMiddle + Math.ceil(c/2)*2; 
				}

				offsets[iOff].follow = follow;
				if (follow != -1) {
					offsets[iOff].fRow = offsets[follow].row;
					offsets[iOff].fColumn = offsets[follow].column;
				} else {
					offsets[iOff].fRow = -1;
					offsets[iOff].fColumn = -1;
				}
//				if ( follow != -1 )
//					if (offsets[follow])
//						warn("offset " + iOff + " on " + offsets[iOff].row + "x" + offsets[iOff].column + " follows "+ offsets[follow].row + "x" + offsets[follow].column);
				
				left--;
			}
			lastMiddle = lm;
			++r;
			this.maxColumnsUsed[r] = n;
		}
		this.maxRowsUsed = r;
	}

	// make sure the average offset is zero, as the formation is centered around that
	// calculating offset distances without a zero average makes no sense, as the formation
	// will jump to a different position any time
	var avgoffset = Vector2D.average(offsets);
	offsets.forEach(function (o) {o.sub(avgoffset);});

	// sort the available places in certain ways
	// the places first in the list will contain the heaviest units as defined by the order
	// of the types list
	if (this.sortingOrder == "fillFromTheSides")
		offsets.sort(function(o1, o2) { return Math.abs(o1.x) < Math.abs(o2.x);});
	else if (this.sortingOrder == "fillToTheCenter")
		offsets.sort(function(o1, o2) {
			return Math.max(Math.abs(o1.x), Math.abs(o1.y)) < Math.max(Math.abs(o2.x), Math.abs(o2.y));
		});
	else if (this.sortingOrder == "fillFromTheCenter")
		offsets.sort(function(o1, o2) {
			return Math.max(Math.abs(o1.x), Math.abs(o1.y)) > Math.max(Math.abs(o2.x), Math.abs(o2.y));
		});
	else if (this.sortingOrder == "fillFromTheFront")
		offsets.sort(function(o1, o2) { return o1.y < o2.y;});
	else if (this.sortingOrder == "fillFromTheBack")
		offsets.sort(function(o1, o2) { return o1.y > o2.y;});

	// query the 2D position of the formation
	var cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	var formationPos = cmpPosition.GetPosition2D();

	// use realistic place assignment,
	// every soldier searches the closest available place in the formation
	var newOffsets = [];
	let realPositions = this.GetRealOffsetPositions(offsets, formationPos);
	for (let i = sortingClasses.length; i; --i)
	{
		let t = types[sortingClasses[i-1]];
		if (!t.length)
			continue;
		let usedOffsets = offsets.splice(-t.length);
		let usedRealPositions = realPositions.splice(-t.length);
		for (let entPos of t)
		{
			let closestOffsetId = this.TakeClosestOffset(entPos, usedRealPositions, usedOffsets);
			usedRealPositions.splice(closestOffsetId, 1);
			newOffsets.push(usedOffsets.splice(closestOffsetId, 1)[0]);
			newOffsets[newOffsets.length - 1].ent = entPos.ent;
		}
	}

	return newOffsets;
};

/**
 * Search the closest position in the realPositions list to the given entity
 * @param ent, the queried entity
 * @param realPositions, the world coordinates of the available offsets
 * @return the index of the closest offset position
 */
Formation.prototype.TakeClosestOffset = function(entPos, realPositions, offsets)
{
	var pos = entPos.pos;
	var closestOffsetId = -1;
	var offsetDistanceSq = Infinity;
	for (var i = 0; i < realPositions.length; i++)
	{
		var distSq = pos.distanceToSquared(realPositions[i]);
		if (distSq < offsetDistanceSq)
		{
			offsetDistanceSq = distSq;
			closestOffsetId = i;
		}
	}
	this.memberPositions[entPos.ent] = {"row": offsets[closestOffsetId].row, "column":offsets[closestOffsetId].column};
	return closestOffsetId;
};

/**
 * Get the world positions for a list of offsets in this formation
 */
Formation.prototype.GetRealOffsetPositions = function(offsets, pos)
{
	let offsetPositions = [];
	let {sin, cos} = this.GetEstimatedOrientation(pos);
	// calculate the world positions
	for (let o of offsets)
		offsetPositions.push(new Vector2D(pos.x + o.y * sin + o.x * cos, pos.y + o.y * cos - o.x * sin));

	return offsetPositions;
};

/**
 * calculate the estimated rotation of the formation
 * based on the first unitAI target position when ordered to walk,
 * based on the current rotation in other cases
 * Return the sine and cosine of the angle
 */
Formation.prototype.GetEstimatedOrientation = function(pos)
{
	let cmpUnitAI = Engine.QueryInterface(this.entity, IID_UnitAI);
	let r = {"sin": 0, "cos": 1};
	let unitAIState = cmpUnitAI.GetCurrentState();
	if (unitAIState == "FORMATIONCONTROLLER.WALKING" || unitAIState == "FORMATIONCONTROLLER.RUNNING" || unitAIState == "FORMATIONCONTROLLER.COMBAT.APPROACHING")
	{
		let targetPos = cmpUnitAI.GetTargetPositions();
		if (!targetPos.length)
			return r;
		let d = targetPos[0].sub(pos).normalize();
		if (!d.x && !d.y)
			return r;
		r.cos = d.y;
		r.sin = d.x;
	}
	else
	{
		let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
		if (!cmpPosition)
			return r;
		let rot = cmpPosition.GetRotation().y;
		r.sin = Math.sin(rot);
		r.cos = Math.cos(rot);
	}
	return r;
};

/**
 * Set formation controller's speed based on its current members.
 */
Formation.prototype.ComputeMotionParameters = function()
{
	var maxRadius = 0;
	var minSpeed = Infinity;

	for (var ent of this.members)
	{
		var cmpUnitMotion = Engine.QueryInterface(ent, IID_UnitMotion);
		if (cmpUnitMotion)
			minSpeed = Math.min(minSpeed, cmpUnitMotion.GetWalkSpeed());
	}
	minSpeed *= this.GetSpeedMultiplier();

	var cmpUnitMotion = Engine.QueryInterface(this.entity, IID_UnitMotion);
	cmpUnitMotion.SetSpeed(minSpeed);
	this.minSpeed = minSpeed;
	this.speed = minSpeed;
};

Formation.prototype.WalkSpeed = function()
{
	let cmpUnitMotion = Engine.QueryInterface(this.entity, IID_UnitMotion);
	cmpUnitMotion.SetSpeed(this.minSpeed);
	this.speed =this.minSpeed;
}

Formation.prototype.MemberCannotRun = function(entity)
{
	let cmpUnitAI = Engine.QueryInterface(this.entity, IID_UnitAI);
	this.WalkSpeed();

	if (!cmpUnitAI)
		return;

	cmpUnitAI.StopRunning();
}

Formation.prototype.MemberCannotCharge = function(entity)
{
	let cmpUnitAI = Engine.QueryInterface(this.entity, IID_UnitAI);
	this.WalkSpeed();

	if (!cmpUnitAI)
		return;

	cmpUnitAI.StopCharging();
}

Formation.prototype.GetSpeed = function()
{
	return this.speed;
}

Formation.prototype.Run = function()
{
	let maxSpeed = 0;

	for (let ent of this.members)
	{
		let cmpUnitMotion = Engine.QueryInterface(ent, IID_UnitMotion);
		if (cmpUnitMotion) {
			if (maxSpeed == 0)
				maxSpeed = cmpUnitMotion.GetRunSpeed();
			else
				maxSpeed = Math.min(maxSpeed, cmpUnitMotion.GetRunSpeed());
		}
	}
	maxSpeed *= this.GetSpeedMultiplier();

	this.speed = maxSpeed;

	let cmpUnitMotion = Engine.QueryInterface(this.entity, IID_UnitMotion);
	cmpUnitMotion.SetSpeed(maxSpeed);
}

Formation.prototype.ShapeUpdate = function()
{
	// Check the distance to twin formations, and merge if when
	// the formations could collide
	for (var i = this.twinFormations.length - 1; i >= 0; --i)
	{
		// only do the check on one side
		if (this.twinFormations[i] <= this.entity)
			continue;

		var cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
		var cmpOtherPosition = Engine.QueryInterface(this.twinFormations[i], IID_Position);
		var cmpOtherFormation = Engine.QueryInterface(this.twinFormations[i], IID_Formation);
		if (!cmpPosition || !cmpOtherPosition || !cmpOtherFormation)
			continue;

		var thisPosition = cmpPosition.GetPosition2D();
		var otherPosition = cmpOtherPosition.GetPosition2D();
		var dx = thisPosition.x - otherPosition.x;
		var dy = thisPosition.y - otherPosition.y;
		var dist = Math.sqrt(dx * dx + dy * dy);

		var thisSize = this.GetSize();
		var otherSize = cmpOtherFormation.GetSize();
		var minDist = Math.max(thisSize.width / 2, thisSize.depth / 2) +
			Math.max(otherSize.width / 2, otherSize.depth / 2) +
			this.formationSeparation;

		if (minDist < dist)
			continue;

		// merge the members from the twin formation into this one
		// twin formations should always have exactly the same orders
		let otherMembers = cmpOtherFormation.members;
		cmpOtherFormation.RemoveMembers(otherMembers);
		this.AddMembers(otherMembers);
		Engine.DestroyEntity(this.twinFormations[i]);
		this.twinFormations.splice(i,1);
	}

	if (!this.canCharge) {
		// Switch between column and box if necessary
		let cmpUnitAI = Engine.QueryInterface(this.entity, IID_UnitAI);
		let walkingDistance = cmpUnitAI.ComputeWalkingDistance();
		let columnar = walkingDistance > g_ColumnDistanceThreshold;
		if (columnar != this.columnar)
		{
			this.offsets = undefined;
			this.columnar = columnar;
			this.MoveMembersIntoFormation(false, true);
			// (disable moveCenter so we can't get stuck in a loop of switching
			// shape causing center to change causing shape to switch back)
		}
	}
};

Formation.prototype.OnGlobalOwnershipChanged = function(msg)
{
	// When an entity is captured or destroyed, it should no longer be
	// controlled by this formation

	if (this.members.indexOf(msg.entity) != -1)
		this.RemoveMembers([msg.entity]);
};

Formation.prototype.OnGlobalEntityRenamed = function(msg)
{
	if (this.members.indexOf(msg.entity) != -1)
	{
		this.offsets = undefined;
		var cmpNewUnitAI = Engine.QueryInterface(msg.newentity, IID_UnitAI);
		if (cmpNewUnitAI)
		{
			this.members[this.members.indexOf(msg.entity)] = msg.newentity;
			this.memberPositions[msg.newentity] = this.memberPositions[msg.entity];
		}

		var cmpOldUnitAI = Engine.QueryInterface(msg.entity, IID_UnitAI);
		cmpOldUnitAI.SetFormationController(INVALID_ENTITY);

		if (cmpNewUnitAI)
			cmpNewUnitAI.SetFormationController(this.entity);

		// Because the renamed entity might have different characteristics,
		// (e.g. packed vs. unpacked siege), we need to recompute motion parameters
		this.ComputeMotionParameters();
	}
};

Formation.prototype.RegisterTwinFormation = function(entity)
{
	var cmpFormation = Engine.QueryInterface(entity, IID_Formation);
	if (!cmpFormation)
		return;
	this.twinFormations.push(entity);
	cmpFormation.twinFormations.push(this.entity);
};

Formation.prototype.DeleteTwinFormations = function()
{
	for (var ent of this.twinFormations)
	{
		var cmpFormation = Engine.QueryInterface(ent, IID_Formation);
		if (cmpFormation)
			cmpFormation.twinFormations.splice(cmpFormation.twinFormations.indexOf(this.entity), 1);
	}
	this.twinFormations = [];
};

Formation.prototype.LoadFormation = function(newTemplate)
{
	// get the old formation info
	let members = this.members.slice();
	let cmpThisUnitAI = Engine.QueryInterface(this.entity, IID_UnitAI);
	let orders = cmpThisUnitAI.GetOrders().slice();
	let offsets = undefined;
	if (this.offsets)
		offsets = this.offsets.slice()
	let memberPositions = undefined;
	if (this.memberPositions)
		memberPositions = this.memberPositions.slice();

	this.Disband();

	let newFormation = Engine.AddEntity(newTemplate);

	// Apply the info from the old formation to the new one

	let cmpNewOwnership = Engine.QueryInterface(newFormation, IID_Ownership);
	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	if (cmpOwnership && cmpNewOwnership)
		cmpNewOwnership.SetOwner(cmpOwnership.GetOwner());

	let cmpNewPosition = Engine.QueryInterface(newFormation, IID_Position);
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (cmpPosition && cmpPosition.IsInWorld() && cmpNewPosition)
		cmpNewPosition.TurnTo(cmpPosition.GetRotation().y);

	let cmpFormation = Engine.QueryInterface(newFormation, IID_Formation);
	let cmpNewUnitAI = Engine.QueryInterface(newFormation, IID_UnitAI);

	let inherit = false;
//	warn(this.template.FormationName + " -> " + cmpFormation.GetName());
	if ( cmpFormation.GetName() == "Open Order" && this.template.FormationName == "Close Order") {
		inherit = true;
		offsets = this.Spread(offsets, 2, 2);
	} 
	else if ( cmpFormation.GetName() == "Close Order" && this.template.FormationName == "Open Order") {
		inherit = true;
		offsets = this.Spread(offsets, 0.5, 0.5);
	}
	if (inherit) {
		cmpFormation.InheritOffsets(offsets);
		cmpFormation.InheritMembers(memberPositions);
	}

	cmpFormation.SetMembers(members);
	if (orders.length)
		cmpNewUnitAI.AddOrders(orders);
	else
		cmpNewUnitAI.MoveIntoFormation();

	let cmpVisual = Engine.QueryInterface(newFormation, IID_Visual);
	if (!cmpVisual)
		return;

	let player = cmpNewOwnership.GetOwner();
	let civ = QueryPlayerIDInterface(player).GetCiv();
	cmpVisual.SetVariant("animationVariant", civ);

	Engine.PostMessage(this.entity, MT_EntityRenamed, { "entity": this.entity, "newentity": newFormation });
};

Engine.RegisterComponentType(IID_Formation, "Formation", Formation);
