function FormationAttack() {}

FormationAttack.prototype.Schema =
	"<element name='CanAttackAsFormation'>" +
		"<text/>" +
	"</element>";

FormationAttack.prototype.Init = function()
{
	this.canAttackAsFormation = this.template.CanAttackAsFormation == "true";
	this.range = this.recalculateRange();
};

FormationAttack.prototype.CanAttackAsFormation = function()
{
	return this.canAttackAsFormation;
};

// Only called when making formation entities selectable for debugging
FormationAttack.prototype.GetAttackTypes = function()
{
	return [];
};

FormationAttack.prototype.GetFullAttackRange = function()
{
	let result = {"min": 0, "max": this.canAttackAsFormation ? -1 : 0};
	let cmpFormation = Engine.QueryInterface(this.entity, IID_Formation);
	if (!cmpFormation)
	{
		warn("FormationAttack component used on a non-formation entity");
		return result;
	}
	let members = cmpFormation.GetMembers();
	for (let ent of members)
	{
		let cmpAttack = Engine.QueryInterface(ent, IID_Attack);
		if (!cmpAttack)
			continue;

		// if the formation can attack, take the minimum max range (so units are certainly in range),
		// If the formation can't attack, take the maximum max range as the point where the formation will be disbanded
		// Always take the minimum min range (to not get impossible situations)
		var range = cmpAttack.GetFullAttackRange();
		if (this.canAttackAsFormation)
		{
			if (range.max < result.max || result.max < 0)
				result.max = range.max;
		}
		else
		{
			if (range.max > result.max || range.max < 0)
				result.max = range.max;
		}
		if (range.min < result.min)
			result.min = range.min;
	}

	return result;
}

FormationAttack.prototype.recalculateRange = function()
{
	let result = {"min": 0, "max": this.canAttackAsFormation ? -1 : 0};
	let cmpFormation = Engine.QueryInterface(this.entity, IID_Formation);
	if (!cmpFormation)
	{
		warn("FormationAttack component used on a non-formation entity");
		return result;
	}
	let members = cmpFormation.GetMembers();
	for (let ent of members)
	{
		let cmpAttack = Engine.QueryInterface(ent, IID_Attack);
		if (!cmpAttack)
			continue;
		let range = cmpAttack.GetFullAttackRange();
		if (range.max > result.max || range.max < 0)
			result.max = range.max;
		if (range.min < result.min)
			result.min = range.min;
	}
	return result;
}
FormationAttack.prototype.GetRange = function(target)
{
	let result = {"min": 0, "max": this.canAttackAsFormation ? -1 : 0};
	let cmpFormation = Engine.QueryInterface(this.entity, IID_Formation);
	if (!cmpFormation)
	{
		warn("FormationAttack component used on a non-formation entity");
		return result;
	}
	let members = cmpFormation.GetMembers();
	for (let ent of members)
	{
		let cmpAttack = Engine.QueryInterface(ent, IID_Attack);
		if (!cmpAttack)
			continue;

		let type = cmpAttack.GetBestAttackAgainst(target);
		if (!type)
			continue;

		// if the formation can attack, take the minimum max range (so units are certainly in range),
		// If the formation can't attack, take the maximum max range as the point where the formation will be disbanded
		// Always take the minimum min range (to not get impossible situations)
		let range = cmpAttack.GetRange(type);

		if (this.canAttackAsFormation)
		{
			if (range.max < result.max || result.max < 0)
				result.max = range.max;
		}
		else
		{
		if (range.max > result.max || range.max < 0)
				result.max = range.max;
		}
		if (range.min < result.min)
			result.min = range.min;
	}
	// add half the formation size, so it counts as the range for the units on the first row
//	var extraRange = cmpFormation.GetSize().depth/3;

//	if (result.max >= 0)
//		result.max += extraRange;

	return result;
};

FormationAttack.prototype.GetBestAttackAgainst = function(target, allowCapture)
{
	let cmpFormation = Engine.QueryInterface(this.entity, IID_Formation);
	if (!cmpFormation){
		warn("Formation.GetBestAttackAgainst called upon no formation");
		return "Melee";
	}
	let members = cmpFormation.GetMembers();
	for (let ent of members)
	{
		let cmpAttack = Engine.QueryInterface(ent, IID_Attack);
		if (!cmpAttack)
			continue;

		let type = cmpAttack.GetBestAttackAgainst(target);
		if (!type)
			continue;
		return type;
	}
	return "Melee";
}

FormationAttack.prototype.CauseChargeDamage = function()
{
	let cmpFormation = Engine.QueryInterface(this.entity, IID_Formation);

	if (!cmpFormation) {
		warn("Charge damage no formation");
		return;
	}

	let members = cmpFormation.GetMembers();
	let attackOwner = Engine.QueryInterface(this.entity, IID_Ownership).GetOwner();
	let cmpDamage = Engine.QueryInterface(SYSTEM_ENTITY, IID_Damage);

//	warn("FormtationAttack: Causing charge damage");
	for (let member of members)
	{
		let cmpAttack = Engine.QueryInterface(member, IID_Attack);
		if (!cmpAttack) {
			warn("FormationAttack: member has no attack"); 
			continue;
		}
		let type = "Melee";
		let strengths = cmpAttack.GetAttackStrengths(type);
		let bonusTemplate = cmpAttack.GetBonusTemplate(type);
		let cmpPosition = Engine.QueryInterface(member, IID_Position);
		let position = cmpPosition.GetPosition();
		let direction = cmpPosition.GetRotation().y;
		cmpDamage.CauseChargeDamage({
			"attacker": member,
			"type": type,
			"strengths": strengths,
			"bonusTemplate": bonusTemplate,
			"position": position,
			"direction": direction,
			"radius": 5,
			"attackerOwner": attackOwner
		});
	}
}

Engine.RegisterComponentType(IID_Attack, "FormationAttack", FormationAttack);
