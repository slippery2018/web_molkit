/*
    WebMolKit

    (c) 2010-2016 Molecular Materials Informatics, Inc.

    All rights reserved
    
    http://molmatinf.com

	[PKG=webmolkit]
*/

///<reference path='../ui/ButtonBank.ts'/>

/*
	CommandBank: the various bank styles that correspond to actions (select-then-do, as opposed to toolbank style which
	is pick-then-interact).
*/

const ELEMENTS_NOBLE:string[] =
[
	"He", "Ar", "Kr", "Xe", "Rn"
];

const ELEMENTS_S_BLOCK:string[] =
[
	"Li", "Na", "K",  "Rb", "Cs", "Fr", "Sc",
	"Be", "Mg", "Ca", "Sr", "Ba", "Ra", "Y"
];
    
const ELEMENTS_P_BLOCK:string[] =
[
	"B",  "Al", "Si", "Ga", "Ge", "As", "Se",
	"In", "Sn", "Sb", "Te", "Tl", "Pb", "Bi", "Po", "At"
];
    
const ELEMENTS_D_BLOCK:string[] =
[
	"Ti", "V" , "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
	"Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd",
	"Hf", "Ta", "W",  "Re", "Os", "Ir", "Pt", "Au", "Hg"
];
    
const ELEMENTS_F_BLOCK:string[] =
[
	"La", "Ce", "Pr", "Nd", "Sm", "Eu", "Gd", "Tb", "Dy",
	"Ho", "Er", "Tm", "Yb", "Lu", "Ac", "Th", "Pa", "U"
];
    
const ELEMENTS_ABBREV:string[] =
[
	"X",  "Y",  "Z",  "Q",  "M",  "L",  "E",  "A",  "R",
	"R0", "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"
];

enum CommandType
{
	Main = 0,
	Atom,
	Bond,
	Select,
	Move,
	Abbrev,
	SBlock,
	PBlock,
	DBlock,
	FBlock,
	Noble
}

class CommandBank extends ButtonBank
{
	constructor(protected owner:any, protected cmdType = CommandType.Main)
	{
		super();
	}

	// populate the buttons
	public update():void
	{
		if (this.cmdType == CommandType.Main)
		{
			this.buttons.push({'id': 'undo', 'imageFN': 'MainUndo', 'helpText': 'Undo last change.'});
			this.buttons.push({'id': 'redo', 'imageFN': 'MainRedo', 'helpText': 'Cancel last undo.'});
			this.buttons.push({'id': 'zoomin', 'imageFN': 'MainZoomIn', 'helpText': 'Zoom in.'});
			this.buttons.push({'id': 'zoomout', 'imageFN': 'MainZoomOut', 'helpText': 'Zoom out.'});
			this.buttons.push({'id': 'zoomfit', 'imageFN': 'MainZoomFit', 'helpText': 'Show whole diagram onscreen.'});
			this.buttons.push({'id': 'selside', 'imageFN': 'MainSelSide', 'helpText': 'Select alternate side of current atom or bond.'});
			this.buttons.push({'id': 'selall', 'imageFN': 'MainSelAll', 'helpText': 'Select all atoms.'});
			this.buttons.push({'id': 'selnone', 'imageFN': 'MainSelNone', 'helpText': 'Clear selection.'});
			this.buttons.push({'id': 'delete', 'imageFN': 'MainDelete', 'helpText': 'Delete selected atoms and bonds.'});
			this.buttons.push({'id': 'cut', 'imageFN': 'MainCut', 'helpText': 'Copy selection to clipboard, and remove.'});
			this.buttons.push({'id': 'copy', 'imageFN': 'MainCopy', 'helpText': 'Copy selection to clipboard.'});
			this.buttons.push({'id': 'paste', 'imageFN': 'MainPaste', 'helpText': 'Paste clipboard contents.'});
			this.buttons.push({'id': 'atom', 'imageFN': 'MainAtom', 'helpText': 'Open the Atom submenu.', 'isSubMenu': true});
			this.buttons.push({'id': 'bond', 'imageFN': 'MainBond', 'helpText': 'Open the Bond submenu.', 'isSubMenu': true});
			this.buttons.push({'id': 'select', 'imageFN': 'MainSelect', 'helpText': 'Open the Selection submenu.', 'isSubMenu': true});
			this.buttons.push({'id': 'move', 'imageFN': 'MainMove', 'helpText': 'Open the Move submenu.', 'isSubMenu': true});
		}
		else if (this.cmdType == CommandType.Atom)
		{
			this.buttons.push({'id': 'element:C', 'text': 'C', 'helpText': 'Change elements to Carbon.'});
			this.buttons.push({'id': 'element:N', 'text': 'N', 'helpText': 'Change elements to Nitrogen.'});
			this.buttons.push({'id': 'element:O', 'text': 'O', 'helpText': 'Change elements to Oxygen.'});
			this.buttons.push({'id': 'element:S', 'text': 'S', 'helpText': 'Change elements to Sulfur.'});
			this.buttons.push({'id': 'element:P', 'text': 'P', 'helpText': 'Change elements to Phosphorus.'});
			this.buttons.push({'id': 'element:H', 'text': 'H', 'helpText': 'Change elements to Hydrogen.'});
			this.buttons.push({'id': 'element:F', 'text': 'F', 'helpText': 'Change elements to Fluorine.'});
			this.buttons.push({'id': 'element:Cl', 'text': 'Cl', 'helpText': 'Change elements to Chlorine.'});
			this.buttons.push({'id': 'element:Br', 'text': 'Br', 'helpText': 'Change elements to Bromine.'});
			this.buttons.push({'id': 'element:I', 'text': 'I', 'helpText': 'Change elements to Iodine.'});
			this.buttons.push({'id': 'plus', 'imageFN': 'AtomPlus', 'helpText': 'Increase the atom charge.'});
			this.buttons.push({'id': 'minus', 'imageFN': 'AtomMinus', 'helpText': 'Decrease the atom charge.'});
			this.buttons.push({'id': 'abbrev', 'imageFN': 'AtomAbbrev', 'helpText': 'Open list of common labels.', 'isSubMenu': true});
			this.buttons.push({'id': 'sblock', 'imageFN': 'AtomSBlock', 'helpText': 'Open list of s-block elements.', 'isSubMenu': true});
			this.buttons.push({'id': 'pblock', 'imageFN': 'AtomPBlock', 'helpText': 'Open list of p-block elements.', 'isSubMenu': true});
			this.buttons.push({'id': 'dblock', 'imageFN': 'AtomDBlock', 'helpText': 'Open list of d-block elements.', 'isSubMenu': true});
			this.buttons.push({'id': 'fblock', 'imageFN': 'AtomFBlock', 'helpText': 'Open list of f-block elements.', 'isSubMenu': true});
			this.buttons.push({'id': 'noble', 'imageFN': 'AtomNoble', 'helpText': 'Open list of noble elements.', 'isSubMenu': true});
		}
		else if (this.cmdType == CommandType.Bond)
		{
			this.buttons.push({'id': 'one', 'imageFN': 'BondOne', 'helpText': 'Create or set bonds to single.'});
			this.buttons.push({'id': 'two', 'imageFN': 'BondTwo', 'helpText': 'Create or set bonds to double.'});
			this.buttons.push({'id': 'three', 'imageFN': 'BondThree', 'helpText': 'Create or set bonds to triple.'});
			this.buttons.push({'id': 'four', 'imageFN': 'BondFour', 'helpText': 'Create or set bonds to quadruple.'});
			this.buttons.push({'id': 'zero', 'imageFN': 'BondZero', 'helpText': 'Create or set bonds to zero-order.'});
			this.buttons.push({'id': 'inclined', 'imageFN': 'BondUp', 'helpText': 'Create or set bonds to inclined.'});
			this.buttons.push({'id': 'declined', 'imageFN': 'BondDown', 'helpText': 'Create or set bonds to declined.'});
			this.buttons.push({'id': 'squig', 'imageFN': 'BondSquig', 'helpText': 'Create or set bonds to unknown stereochemistry.'});
			this.buttons.push({'id': 'addtwo', 'imageFN': 'BondAddTwo', 'helpText': 'Add two new bonds to the subject atom.'});
			this.buttons.push({'id': 'insert', 'imageFN': 'BondInsert', 'helpText': 'Insert a methylene into the subject bond.'});
			this.buttons.push({'id': 'switch', 'imageFN': 'BondSwitch', 'helpText': 'Cycle through likely bond geometries.'});
			this.buttons.push({'id': 'linear', 'imageFN': 'BondLinear', 'helpText': 'Apply linear geometry.'});
			this.buttons.push({'id': 'trigonal', 'imageFN': 'BondTrigonal', 'helpText': 'Apply trigonal geometry.'});
			this.buttons.push({'id': 'tetra1', 'imageFN': 'BondTetra1', 'helpText': 'Apply tetrahedral geometry #1.'});
			this.buttons.push({'id': 'tetra2', 'imageFN': 'BondTetra2', 'helpText': 'Apply tetrahedral geometry #2.'});
			this.buttons.push({'id': 'sqplan', 'imageFN': 'BondSqPlan', 'helpText': 'Apply square planar geometry.'});
			this.buttons.push({'id': 'octa1', 'imageFN': 'BondOcta1', 'helpText': 'Apply octahedral geometry #1.'});
			this.buttons.push({'id': 'octa2', 'imageFN': 'BondOcta2', 'helpText': 'Apply octahedral geometry #2.'});
			this.buttons.push({'id': 'connect', 'imageFN': 'BondConnect', 'helpText': 'Connect selected atoms, by proximity.'});
			this.buttons.push({'id': 'disconnect', 'imageFN': 'BondDisconnect', 'helpText': 'Disconnect selected atoms.'});
		}
		else if (this.cmdType == CommandType.Select)
		{
			this.buttons.push({'id': 'selgrow', 'imageFN': 'SelectionGrow', 'helpText': 'Add adjacent atoms to selection.'});
			this.buttons.push({'id': 'selshrink', 'imageFN': 'SelectionShrink', 'helpText': 'Unselect exterior atoms.'});
			this.buttons.push({'id': 'selchain', 'imageFN': 'SelectionChain', 'helpText': 'Extend selection to non-ring atoms.'});
			this.buttons.push({'id': 'smallring', 'imageFN': 'SelectionSmRing', 'helpText': 'Extend selection to small rings.'});
			this.buttons.push({'id': 'ringblock', 'imageFN': 'SelectionRingBlk', 'helpText': 'Extend selection to ring blocks.'});
			this.buttons.push({'id': 'curelement', 'imageFN': 'SelectionCurElement', 'helpText': 'Select all atoms of current element type.'});
			this.buttons.push({'id': 'selprev', 'imageFN': 'MainSelPrev', 'helpText': 'Select previous connected component.'});
			this.buttons.push({'id': 'selnext', 'imageFN': 'MainSelNext', 'helpText': 'Select next connected component.'});
			this.buttons.push({'id': 'toggle', 'imageFN': 'SelectionToggle', 'helpText': 'Toggle selection of current.'});
			this.buttons.push({'id': 'uncurrent', 'imageFN': 'SelectionUncurrent', 'helpText': 'Undefine current object.'});
			this.buttons.push({'id': 'join', 'imageFN': 'MoveJoin', 'helpText': 'Overlapping atoms will be joined as one.'});
			this.buttons.push({'id': 'new', 'imageFN': 'MainNew', 'helpText': 'Clear the molecular structure..'});
			this.buttons.push({'id': 'inline', 'imageFN': 'AtomInline', 'helpText': 'Make selected atoms into an inline abbreviation.'});
			this.buttons.push({'id': 'formula', 'imageFN': 'AtomFormula', 'helpText': 'Make selected atoms into their molecule formula.'});
			this.buttons.push({'id': 'clearabbrev', 'imageFN': 'AtomClearAbbrev', 'helpText': 'Remove inline abbreviation.'});
			this.buttons.push({'id': 'expandabbrev', 'imageFN': 'AtomExpandAbbrev', 'helpText': 'Expand out the inline abbreviation.'});
		}
		else if (this.cmdType == CommandType.Move)
		{
			this.buttons.push({'id': 'up', 'imageFN': 'MoveUp', 'helpText': 'Move subject atoms up slightly.'});
			this.buttons.push({'id': 'down', 'imageFN': 'MoveDown', 'helpText': 'Move subject atoms down slightly.'});
			this.buttons.push({'id': 'left', 'imageFN': 'MoveLeft', 'helpText': 'Move subject atoms slightly to the left.'});
			this.buttons.push({'id': 'right', 'imageFN': 'MoveRight', 'helpText': 'Move subject atoms slightly to the right.'});
			this.buttons.push({'id': 'uplots', 'imageFN': 'MoveUpLots', 'helpText': 'Move subject atoms up somewhat.'});
			this.buttons.push({'id': 'downlots', 'imageFN': 'MoveDownLots', 'helpText': 'Move subject atoms down somewhat.'});
			this.buttons.push({'id': 'leftlots', 'imageFN': 'MoveLeftLots', 'helpText': 'Move subject atoms somewhat to the left.'});
			this.buttons.push({'id': 'rightlots', 'imageFN': 'MoveRightLots', 'helpText': 'Move subject atoms somewhat to the right.'});
			this.buttons.push({'id': 'upfar', 'imageFN': 'MoveUpFar', 'helpText': 'Move subject atoms far up.'});
			this.buttons.push({'id': 'downfar', 'imageFN': 'MoveDownFar', 'helpText': 'Move subject atoms far down.'});
			this.buttons.push({'id': 'leftfar', 'imageFN': 'MoveLeftFar', 'helpText': 'Move subject atoms far to the left.'});
			this.buttons.push({'id': 'rightfar', 'imageFN': 'MoveRightFar', 'helpText': 'Move subject atoms far to the right.'});
			this.buttons.push({'id': 'rotp01', 'imageFN': 'MoveRotP01', 'helpText': 'Rotate 1\u00B0 counter-clockwise.'});
			this.buttons.push({'id': 'rotm01', 'imageFN': 'MoveRotM01', 'helpText': 'Rotate 1\u00B0 clockwise.'});
			this.buttons.push({'id': 'rotp05', 'imageFN': 'MoveRotP05', 'helpText': 'Rotate 5\u00B0 counter-clockwise.'});
			this.buttons.push({'id': 'rotm05', 'imageFN': 'MoveRotM05', 'helpText': 'Rotate 5\u00B0 clockwise.'});
			this.buttons.push({'id': 'rotp15', 'imageFN': 'MoveRotP15', 'helpText': 'Rotate 15\u00B0 counter-clockwise.'});
			this.buttons.push({'id': 'rotm15', 'imageFN': 'MoveRotM15', 'helpText': 'Rotate 15\u00B0 clockwise.'});
			this.buttons.push({'id': 'rotp30', 'imageFN': 'MoveRotP30', 'helpText': 'Rotate 30\u00B0 counter-clockwise.'});
			this.buttons.push({'id': 'rotm30', 'imageFN': 'MoveRotM30', 'helpText': 'Rotate 30\u00B0 clockwise.'});
			this.buttons.push({'id': 'hflip', 'imageFN': 'MoveHFlip', 'helpText': 'Flip subject atoms horizontally.'});
			this.buttons.push({'id': 'vflip', 'imageFN': 'MoveVFlip', 'helpText': 'Flip subject atoms vertically.'});
			this.buttons.push({'id': 'shrink', 'imageFN': 'MoveShrink', 'helpText': 'Decrease subject bond distances.'});
			this.buttons.push({'id': 'grow', 'imageFN': 'MoveGrow', 'helpText': 'Increase subject bond distances.'});
		}
		else if (this.cmdType == CommandType.Abbrev) this.populateElements(ELEMENTS_NOBLE);
		else if (this.cmdType == CommandType.SBlock) this.populateElements(ELEMENTS_S_BLOCK);
		else if (this.cmdType == CommandType.PBlock) this.populateElements(ELEMENTS_P_BLOCK);
		else if (this.cmdType == CommandType.DBlock) this.populateElements(ELEMENTS_D_BLOCK);
		else if (this.cmdType == CommandType.FBlock) this.populateElements(ELEMENTS_F_BLOCK);
		else if (this.cmdType == CommandType.Noble) this.populateElements(ELEMENTS_ABBREV);
	}

	private populateElements(elements:string[]):void
	{
		for (let el of elements)
		{
			this.buttons.push({'id': `element:${el}`, 'text': el, 'helpText': `Change elements to ${el}.`});
		}
	}

	// react to a button click
	public hitButton(id:string):void
	{
		let actv = 0, param:any = null;

		if (id.startsWith('element:'))
		{
			let el = id.substring(8);
			actv = ActivityType.Element;
			param = {'element': el};
		}
		else if (id == 'delete') actv = ActivityType.Delete;
		else if (id == 'undo')
		{
			if (this.owner.canUndo()) this.owner.performUndo();
			else this.owner.showMessage('Nothing to undo.');
		}
		else if (id == 'redo')
		{
			if (this.owner.canRedo()) this.owner.performRedo();
			else this.owner.showMessage('Nothing to redo.');
		}
		else if (id == 'cut') actv = ActivityType.Cut;
		else if (id == 'copy') actv = ActivityType.Copy;
		else if (id == 'paste') this.owner.performPaste();
		else if (id == 'new') actv = ActivityType.Clear;
		else if (id == 'zoomfit') this.owner.autoScale();
		else if (id == 'zoomout') this.owner.zoom(0.8);
		else if (id == 'zoomin') this.owner.zoom(1.25);
		else if (id == 'selall') actv = ActivityType.SelectAll;
		else if (id == 'selnone') actv = ActivityType.SelectNone;
		else if (id == 'selprev') actv = ActivityType.SelectPrevComp;
		else if (id == 'selnext') actv = ActivityType.SelectNextComp;
		else if (id == 'selside') actv = ActivityType.SelectSide;
		else if (id == 'plus') {actv = ActivityType.Charge; param = {'delta': 1};}
		else if (id == 'minus') {actv = ActivityType.Charge; param = {'delta': -1};}
		else if (id == 'one') {actv = ActivityType.BondOrder; param = {'order': 1};}
		else if (id == 'two') {actv = ActivityType.BondOrder; param = {'order': 2};}
		else if (id == 'three') {actv = ActivityType.BondOrder; param = {'order': 3};}
		else if (id == 'four') {actv = ActivityType.BondOrder; param = {'order': 4};}
		else if (id == 'zero') {actv = ActivityType.BondOrder; param = {'order': 0};}
		else if (id == 'inclined') {actv = ActivityType.BondType; param = {'type': Molecule.BONDTYPE_INCLINED};}
		else if (id == 'declined') {actv = ActivityType.BondType; param = {'type': Molecule.BONDTYPE_DECLINED};}
		else if (id == 'squig') {actv = ActivityType.BondType; param = {'type': Molecule.BONDTYPE_UNKNOWN};}
		else if (id == 'linear') {actv = ActivityType.BondGeom; param = {'geom': 'linear'};}
		else if (id == 'trigonal') {actv = ActivityType.BondGeom;  param = {'geom': 'trigonal'};}
		else if (id == 'tetra1') {actv = ActivityType.BondGeom;  param = {'geom': 'tetra1'};}
		else if (id == 'tetra2') {actv = ActivityType.BondGeom;  param = {'geom': 'tetra2'};}
		else if (id == 'sqplan') {actv = ActivityType.BondGeom;  param = {'geom': 'sqplan'};}
		else if (id == 'octa1') {actv = ActivityType.BondGeom;  param = {'geom': 'octa1'};}
		else if (id == 'octa2') {actv = ActivityType.BondGeom;  param = {'geom': 'octa2'};}
		else if (id == 'switch') actv = ActivityType.BondSwitch;
		else if (id == 'connect') actv = ActivityType.Connect;
		else if (id == 'disconnect') actv = ActivityType.Disconnect;
		else if (id == 'addtwo') actv = ActivityType.BondAddTwo;
		else if (id == 'insert') actv = ActivityType.BondInsert;
		else if (id == 'curelement') actv = ActivityType.SelectCurElement;
		else if (id == 'selgrow') actv = ActivityType.SelectGrow;
		else if (id == 'selshrink') actv = ActivityType.SelectShrink;
		else if (id == 'selprev') actv = ActivityType.SelectPrevComp;
		else if (id == 'selnext') actv = ActivityType.SelectNextComp;
		else if (id == 'selchain') actv = ActivityType.SelectChain;
		else if (id == 'smallring') actv = ActivityType.SelectSmRing;
		else if (id == 'ringblock') actv = ActivityType.SelectRingBlk;
		else if (id == 'toggle') actv = ActivityType.SelectToggle;
		else if (id == 'uncurrent') actv = ActivityType.SelectUnCurrent;
		else if (id == 'join') actv = ActivityType.Join;
		else if (id == 'inline') actv = ActivityType.AbbrevInline;
		else if (id == 'formula') actv = ActivityType.AbbrevFormula;
		else if (id == 'clearabbrev') actv = ActivityType.AbbrevClear;
		else if (id == 'expandabbrev') actv = ActivityType.AbbrevExpand;
		else if (id == 'up') {actv = ActivityType.Nudge; param = {'dir': 'up'};}
		else if (id == 'down') {actv = ActivityType.Nudge; param = {'dir': 'down'};}
		else if (id == 'left') {actv = ActivityType.Nudge; param = {'dir': 'left'};}
		else if (id == 'right') {actv = ActivityType.Nudge; param = {'dir': 'right'};}
		else if (id == 'uplots') {actv = ActivityType.NudgeLots; param = {'dir': 'up'};}
		else if (id == 'downlots') {actv = ActivityType.NudgeLots; param = {'dir': 'down'};}
		else if (id == 'leftlots') {actv = ActivityType.NudgeLots; param = {'dir': 'left'};}
		else if (id == 'rightlots') {actv = ActivityType.NudgeLots; param = {'dir': 'right'};}
		else if (id == 'upfar') {actv = ActivityType.NudgeFar; param = {'dir': 'up'};}
		else if (id == 'downfar') {actv = ActivityType.NudgeFar; param = {'dir': 'down'};}
		else if (id == 'leftfar') {actv = ActivityType.NudgeFar; param = {'dir': 'left'};}
		else if (id == 'rightfar') {actv = ActivityType.NudgeFar; param = {'dir': 'right'};}
		else if (id == 'rotp01') {actv = ActivityType.Rotate; param = {'theta': 1};}
		else if (id == 'rotm01') {actv = ActivityType.Rotate; param = {'theta': -1};}
		else if (id == 'rotp05') {actv = ActivityType.Rotate; param = {'theta': 5};}
		else if (id == 'rotm05') {actv = ActivityType.Rotate; param = {'theta': -5};}
		else if (id == 'rotp15') {actv = ActivityType.Rotate; param = {'theta': 15};}
		else if (id == 'rotm15') {actv = ActivityType.Rotate; param = {'theta': -15};}
		else if (id == 'rotp30') {actv = ActivityType.Rotate; param = {'theta': 30};}
		else if (id == 'rotm30') {actv = ActivityType.Rotate; param = {'theta': -30};}
		else if (id == 'hflip') {actv = ActivityType.Flip; param = {'axis': 'hor'};}
		else if (id == 'vflip') {actv = ActivityType.Flip; param = {'axis': 'ver'};}
		else if (id == 'shrink') {actv = ActivityType.Scale; param = {'mag': 1 / 1.1};}
		else if (id == 'grow') {actv = ActivityType.Scale; param = {'mag': 1.1};}
		else if (id == 'atom') this.buttonView.pushBank(new CommandBank(this.owner, CommandType.Atom));
		else if (id == 'bond') this.buttonView.pushBank(new CommandBank(this.owner, CommandType.Bond));
		else if (id == 'select') this.buttonView.pushBank(new CommandBank(this.owner, CommandType.Select));
		else if (id == 'move') this.buttonView.pushBank(new CommandBank(this.owner, CommandType.Move));
		else if (id == 'abbrev') this.buttonView.pushBank(new CommandBank(this.owner, CommandType.Abbrev));
		else if (id == 'sblock') this.buttonView.pushBank(new CommandBank(this.owner, CommandType.SBlock));
		else if (id == 'pblock') this.buttonView.pushBank(new CommandBank(this.owner, CommandType.PBlock));
		else if (id == 'dblock') this.buttonView.pushBank(new CommandBank(this.owner, CommandType.DBlock));
		else if (id == 'fblock') this.buttonView.pushBank(new CommandBank(this.owner, CommandType.FBlock));
		else if (id == 'noble') this.buttonView.pushBank(new CommandBank(this.owner, CommandType.Noble));
		else alert('Unhandled command: "' + id + '"');
		
		if (actv > 0)
		{
			new MoleculeActivity(this.owner, actv, param).execute();
		}
	}
}
