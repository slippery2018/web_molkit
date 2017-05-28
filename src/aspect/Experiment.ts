/*
    WebMolKit

    (c) 2010-2017 Molecular Materials Informatics, Inc.

    All rights reserved
    
    http://molmatinf.com

	[PKG=webmolkit]
*/

///<reference path='../util/util.ts'/>
///<reference path='../data/DataSheet.ts'/>
///<reference path='../data/MoleculeStream.ts'/>
///<reference path='Aspect.ts'/>

/*
	Experiment aspect: transforms groups of rows from a datasheet into a collection of structures that make up a
	multistep reaction, along with accompanying quantities and other miscellaneous information.
*/

class ExperimentComponent
{
	public mol:Molecule = null;
	public name = '';
	public stoich = '';
	public mass:number = null;
	public volume:number = null;
	public moles:number = null;
	public density:number = null;
	public conc:number = null;
	public yield:number = null; // products only
	public primary = false; // reactants only
	public waste = false; // products only
	public equiv:number = null; // reagents only

	constructor(mol?:Molecule, name?:string)
	{
		this.mol = mol;
		if (name) this.name = name;
	}

	// makes a deep copy (assuming that molecules are treated as immutable)
	public clone():ExperimentComponent
	{
		let dup = new ExperimentComponent(this.mol, this.name);
		dup.stoich = this.stoich;
		dup.mass = this.mass;
		dup.volume = this.volume;
		dup.moles = this.moles;
		dup.density = this.density;
		dup.conc = this.conc;
		dup.yield = this.yield;
		dup.primary = this.primary;
		dup.waste = this.waste;
		dup.equiv = this.equiv;
		return dup;
	}
	
	public equals(other:ExperimentComponent):boolean
	{
		if (this.name != other.name) return false;
		if (this.stoich != other.stoich || this.mass != other.mass || this.volume != other.volume || this.moles != other.moles || 
			this.density != other.density || this.conc != other.conc || this.yield != other.yield || this.primary != other.primary || 
			this.waste != other.waste || this.equiv != other.equiv) return false;
		if (this.mol === other.mol) return true; // if literally the same
		if (this.mol == null || other.mol == null) return false;
		return this.mol.compareTo(other.mol) == 0;
	}
	
	public isBlank():boolean
	{
		return MolUtil.isBlank(this.mol) && !this.name;
	}
}

class ExperimentStep
{
	public reactants:ExperimentComponent[] = []; // non-blank only for the first step
	public reagents:ExperimentComponent[] = [];
	public products:ExperimentComponent[] = [];
	
	contructor() {}
	
	// makes a deep copy (assuming that molecules are treated as immutable)
	public clone():ExperimentStep
	{
		let dup = new ExperimentStep();
		for (let c of this.reactants) dup.reactants.push(c.clone());
		for (let c of this.reagents) dup.reagents.push(c.clone());
		for (let c of this.products) dup.products.push(c.clone());
		return dup;
	}
	
	public equals(other:ExperimentStep):boolean
	{
		if (this.reactants.length != other.reactants.length) return false;
		if (this.reagents.length != other.reagents.length) return false;
		if (this.products.length != other.products.length) return false;
		for (let n = 0; n < this.reactants.length; n++) if (!this.reactants[n].equals(other.reactants[n])) return false;
		for (let n = 0; n < this.reagents.length; n++) if (!this.reagents[n].equals(other.reagents[n])) return false;
		for (let n = 0; n < this.products.length; n++) if (!this.products[n].equals(other.products[n])) return false;
		return true
	}
}

class ExperimentEntry
{
	public title = '';
	public createDate:Date = null;
	public modifyDate:Date = null;
	public doi = '';
	
	public steps:ExperimentStep[] = [];
	
	constructor() {}
	
	// makes a deep copy (assuming that molecules are treated as immutable)
	public clone():ExperimentEntry
	{
		let dup = new ExperimentEntry();
		dup.title = this.title;
		dup.createDate = this.createDate;
		dup.modifyDate = this.modifyDate;
		dup.doi = this.doi;
		for (let s of this.steps) dup.steps.push(s.clone());
		return dup;
	}
	
	// as above, but clones all the molecules too so they can be modified safely
	public deepClone():ExperimentEntry
	{
		let dup = this.clone();
		for (let step of dup.steps)
		{
			for (let comp of step.reactants) if (comp.mol != null) comp.mol = comp.mol.clone();
			for (let comp of step.reagents) if (comp.mol != null) comp.mol = comp.mol.clone();
			for (let comp of step.products) if (comp.mol != null) comp.mol = comp.mol.clone();
		}
		return dup;
	}
	
	public equals(other:ExperimentEntry):boolean
	{
		if (this.title != other.title) return false;
		let d1 = this.createDate == null ? 0 : this.createDate.getTime(), d2 = other.createDate == null ? 0 : other.createDate.getTime();
		if (d1 != d2) return false;
		let d3 = this.modifyDate == null ? 0 : this.modifyDate.getTime(), d4 = other.modifyDate == null ? 0 : other.modifyDate.getTime();
		if (d3 != d4) return false;
		if (this.doi != other.doi) return false;
		if (this.steps.length != other.steps.length) return false;
		for (let n = 0; n < this.steps.length; n++) if (!this.steps[n].equals(other.steps[n])) return false;
		return true;
	}
	
	// convenience: saves a switch
	public getComponent(step:number, type:number, idx:number):ExperimentComponent
	{
		if (type == Experiment.REACTANT) return this.steps[step].reactants[idx];
		if (type == Experiment.REAGENT) return this.steps[step].reagents[idx];
		if (type == Experiment.PRODUCT) return this.steps[step].products[idx];
		return new ExperimentComponent();
	}
}

class Experiment extends Aspect
{
	public static CODE = 'org.mmi.aspect.Experiment';
	public static CODE_RXN = 'org.mmi.aspect.Reaction';
	public static CODE_YLD = 'org.mmi.aspect.Yield';
	public static NAME = 'Experiment';
	public static NAME_RXN = 'Reaction';
	public static NAME_YLD = 'Yield';

	public static REACTANT = 1;
	public static REAGENT = 2;
	public static PRODUCT = 3;

	public static COLNAME_EXPERIMENT_TITLE = 'ExperimentTitle';
	public static COLNAME_EXPERIMENT_CREATEDATE = 'ExperimentCreateDate';
	public static COLNAME_EXPERIMENT_MODIFYDATE = 'ExperimentModifyDate';
	public static COLNAME_EXPERIMENT_DOI = 'ExperimentDOI';
	
	// prefixes for Reactants
	public static COLNAME_REACTANT_MOL = 'ReactantMol';
	public static COLNAME_REACTANT_NAME = 'ReactantName';
	public static COLNAME_REACTANT_STOICH = 'ReactantStoich';
	public static COLNAME_REACTANT_MASS = 'ReactantMass';
	public static COLNAME_REACTANT_VOLUME = 'ReactantVolume';
	public static COLNAME_REACTANT_MOLES = 'ReactantMoles';
	public static COLNAME_REACTANT_DENSITY = 'ReactantDensity';
	public static COLNAME_REACTANT_CONC = 'ReactantConc';
	public static COLNAME_REACTANT_PRIMARY = 'ReactantPrimary';

	// prefixes for Reagents
	public static COLNAME_REAGENT_MOL = 'ReagentMol';
	public static COLNAME_REAGENT_NAME = 'ReagentName';
	public static COLNAME_REAGENT_EQUIV = 'ReagentEquiv';
	public static COLNAME_REAGENT_MASS = 'ReagentMass';
	public static COLNAME_REAGENT_VOLUME = 'ReagentVolume';
	public static COLNAME_REAGENT_MOLES = 'ReagentMoles';
	public static COLNAME_REAGENT_DENSITY = 'ReagentDensity';
	public static COLNAME_REAGENT_CONC = 'ReagentConc';

	// prefixes for Products
	public static COLNAME_PRODUCT_MOL = 'ProductMol';
	public static COLNAME_PRODUCT_NAME = 'ProductName';
	public static COLNAME_PRODUCT_STOICH = 'ProductStoich';
	public static COLNAME_PRODUCT_MASS = 'ProductMass';
	public static COLNAME_PRODUCT_VOLUME = 'ProductVolume';
	public static COLNAME_PRODUCT_MOLES = 'ProductMoles';
	public static COLNAME_PRODUCT_DENSITY = 'ProductDensity';
	public static COLNAME_PRODUCT_CONC = 'ProductConc';
	public static COLNAME_PRODUCT_YIELD = 'ProductYield';
	public static COLNAME_PRODUCT_WASTE = 'ProductWaste';

	public static COLUMN_DESCRIPTIONS:{[id:string] : string} = {};

	// ----------------- public methods -----------------

	// used to test if a datasheet has the appropriate metadata flagging it as a feedstock-containing datasheet
	public static isExperiment(ds:DataSheet):boolean
	{
		for (let n = 0; n < ds.numExtensions; n++) if (ds.getExtType(n) == Experiment.CODE) return true;
		return false;
	}

	constructor(ds?:DataSheet, allowModify?:boolean)
	{
		super(ds, allowModify);

		if ($.isEmptyObject(Experiment.COLUMN_DESCRIPTIONS))
		{
			let v = Experiment.COLUMN_DESCRIPTIONS;
			v[Experiment.COLNAME_EXPERIMENT_TITLE] = 'Title description for the experiment';
			v[Experiment.COLNAME_EXPERIMENT_CREATEDATE] = 'Date the experiment was created (seconds since 1970)';
			v[Experiment.COLNAME_EXPERIMENT_MODIFYDATE] = 'Date the experiment was last modified (seconds since 1970)';
			v[Experiment.COLNAME_EXPERIMENT_DOI] = 'Digital object identifiers (DOI) for the experiment (whitespace separated)';
			v[Experiment.COLNAME_REACTANT_MOL] = 'Molecular structure of reactant';
			v[Experiment.COLNAME_REACTANT_NAME] = 'Name of reactant';
			v[Experiment.COLNAME_REACTANT_STOICH] = 'Stoichiometry of reactant';
			v[Experiment.COLNAME_REACTANT_MASS] = 'Mass quantity of reactant (g)';
			v[Experiment.COLNAME_REACTANT_VOLUME] = 'Volume quantity of reactant (mL)';
			v[Experiment.COLNAME_REACTANT_MOLES] = 'Molar quantity of reactant (mol)';
			v[Experiment.COLNAME_REACTANT_DENSITY] = 'Density of reactant (g/mL)';
			v[Experiment.COLNAME_REACTANT_CONC] = 'Concentration of reactant (mol/L)';
			v[Experiment.COLNAME_REACTANT_PRIMARY] = 'Whether the reactant is used for yield calculation';
			v[Experiment.COLNAME_REAGENT_MOL] = 'Molecular structure of reagent';
			v[Experiment.COLNAME_REAGENT_NAME] = 'Name of reagent';
			v[Experiment.COLNAME_REAGENT_EQUIV] = 'Molar equivalents of reagent';
			v[Experiment.COLNAME_REAGENT_MASS] = 'Mass quantity of reagent (g)';
			v[Experiment.COLNAME_REAGENT_VOLUME] = 'Volume quantity of reagent (mL)';
			v[Experiment.COLNAME_REAGENT_MOLES] = 'Molar quantity of reagent (mol)';
			v[Experiment.COLNAME_REAGENT_DENSITY] = 'Density of reagent (g/mL)';
			v[Experiment.COLNAME_REAGENT_CONC] = 'Concentration of reagent (mol/L)';
			v[Experiment.COLNAME_PRODUCT_MOL] = 'Molecular structure of product';
			v[Experiment.COLNAME_PRODUCT_NAME] = 'Name of product';
			v[Experiment.COLNAME_PRODUCT_STOICH] = 'Stoichiometry of product';
			v[Experiment.COLNAME_PRODUCT_MASS] = 'Mass quantity of reactant (g)';
			v[Experiment.COLNAME_PRODUCT_VOLUME] = 'Volume quantity of reactant (mL)';
			v[Experiment.COLNAME_PRODUCT_MOLES] = 'Molar quantity of reactant (mol)';
			v[Experiment.COLNAME_PRODUCT_DENSITY] = 'Density of reactant (g/mL)';
			v[Experiment.COLNAME_PRODUCT_CONC] = 'Concentration of reactant (mol/L)';
			v[Experiment.COLNAME_PRODUCT_YIELD] = 'Yield of product (%)';
			v[Experiment.COLNAME_PRODUCT_WASTE] = 'Whether the product is an unwanted byproduct';			
		}

		this.setup();
	}

	// returns true if the row is at the beginning of an experiment
	public isFirstStep(row:number):boolean
	{
		if (this.ds.notNull(row, Experiment.COLNAME_EXPERIMENT_CREATEDATE)) return true;
		let mol = this.ds.getMolecule(row, Experiment.COLNAME_REACTANT_MOL + '1');
		if (MolUtil.notBlank(mol)) return true;
		let name = this.ds.getString(row, Experiment.COLNAME_REACTANT_NAME + '1');
		if (name) return true;
		return false;
	}

	// starting at the given row, figure out how many rows ("steps") the reaction spans; always 1-or-more
	public numberOfSteps(row:number):number
	{
		if (row >= this.ds.numRows) return 0;
		let steps = 1;
		while (row + steps < this.ds.numRows)
		{
			if (this.isFirstStep(row + steps)) break;
			steps++;
		}
		return steps;
	}

	// data access
	public getEntry(row:number):ExperimentEntry
	{
		let entry = new ExperimentEntry();

		let title = this.ds.getString(row, Experiment.COLNAME_EXPERIMENT_TITLE);
		if (title) entry.title = title;
		let createDate = this.ds.getReal(row, Experiment.COLNAME_EXPERIMENT_CREATEDATE);
		if (createDate) entry.createDate = new Date(createDate * 1000);
		let modifyDate = this.ds.getReal(row, Experiment.COLNAME_EXPERIMENT_MODIFYDATE);
		if (modifyDate) entry.modifyDate = new Date(modifyDate * 1000);
		let doi = this.ds.getString(row, Experiment.COLNAME_EXPERIMENT_DOI);
		if (doi) entry.doi = doi;

		let [nreactants, nproducts, nreagents] = this.countComponents();
		
		for (let pos = row; pos < this.ds.numRows; pos++)
		{
			if (pos > row && this.isFirstStep(pos)) break;
			
			let step = new ExperimentStep();
			if (pos == row) for (let n = 1; n <= nreactants; n++)
			{
				let comp = this.fetchReactant(pos, n);
				if (comp != null) step.reactants.push(comp); else break;
			}
			for (let n = 1; n <= nproducts; n++)
			{
				let comp = this.fetchProduct(pos, n);
				if (comp != null) step.products.push(comp); else break;
			}
			for (let n = 1; n <= nreagents; n++)
			{
				let comp = this.fetchReagent(pos, n);
				if (comp != null) step.reagents.push(comp); else break;
			}
			
			entry.steps.push(step);
		}

		return entry
	}
	public setEntry(row:number, entry:ExperimentEntry):void
	{
		this.putEntry(row, entry, true);
	}
	public addEntry(entry:ExperimentEntry):void
	{
		this.putEntry(this.ds.numRows, entry, false);
	}
	public insertEntry(row:number, entry:ExperimentEntry):void
	{
		this.putEntry(row, entry, false);
	}
	public deleteEntry(row:number):void
	{
		let nsteps = this.numberOfSteps(row);
		for (let n = row + nsteps - 1; n >= row; n--) this.ds.deleteRow(n);
	}

	// ----------------- private methods -----------------

	// workhorse for the constructor 
	private setup():void  
	{
		this.parseAndCorrect();
	}

    // assuming that the underlying datasheet definitely is a datasheet, makes any necessary corrections to force it into compliance
	private parseAndCorrect():void
    {
		let ds = this.ds;
		let idxRxn = -1, idxYld = -1, idxExp = -1;
		let extRxn = '', extYld = '', extExp = '';
		for (let n = 0; n < ds.numExtensions; n++)
		{
			if (ds.getExtType(n) == Experiment.CODE_RXN) {idxRxn = n; extRxn = ds.getExtData(n);}
			else if (ds.getExtType(n) == Experiment.CODE_YLD) {idxYld = n; extYld = ds.getExtData(n);}
			else if (ds.getExtType(n) == Experiment.CODE) {idxExp = n; extExp = ds.getExtData(n);}
		}
		
		// note: the implied Reaction aspect is the only metadata field that actually holds content
		let [nreactants, nproducts, nreagents] = this.parseReactionMetaData(extRxn)
		let meta = `nreactants=${nreactants}\nnproducts=${nproducts}\nnreagents=${nreagents}\n`;
		if (idxRxn >= 0) ds.setExtData(idxRxn, meta); else ds.appendExtension(Experiment.NAME_RXN, Experiment.CODE_RXN, meta); 
		if (idxYld >= 0) ds.setExtData(idxYld, ''); else ds.appendExtension(Experiment.NAME_YLD, Experiment.CODE_YLD, '');
		if (idxExp >= 0) ds.setExtData(idxExp, ''); else ds.appendExtension(Experiment.NAME, Experiment.CODE, '');

		this.forceColumn(Experiment.COLNAME_EXPERIMENT_TITLE, DataSheet.COLTYPE_STRING);  
		this.forceColumn(Experiment.COLNAME_EXPERIMENT_CREATEDATE, DataSheet.COLTYPE_REAL);  
		this.forceColumn(Experiment.COLNAME_EXPERIMENT_MODIFYDATE, DataSheet.COLTYPE_REAL);  
		this.forceColumn(Experiment.COLNAME_EXPERIMENT_DOI, DataSheet.COLTYPE_STRING);  
		
		for (let n = 1; n <= nreactants; n++) this.forceReactantColumns(n);
		for (let n = 1; n <= nreagents; n++) this.forceReagentColumns(n);
		for (let n = 1; n <= nproducts; n++) this.forceProductColumns(n);
    }

	// force-adds respective groups of columns as necessary
	private forceColumn(colName:string, type:string, suffix?:number):void
	{
		let useName = colName + (suffix == null ? '' : suffix);
		this.ds.ensureColumn(useName, type, Experiment.COLUMN_DESCRIPTIONS[colName]);
	}  
	private forceReactantColumns(suffix:number):void
	{
		this.forceColumn(Experiment.COLNAME_REACTANT_MOL, DataSheet.COLTYPE_MOLECULE, suffix);
		this.forceColumn(Experiment.COLNAME_REACTANT_NAME, DataSheet.COLTYPE_STRING, suffix);
		this.forceColumn(Experiment.COLNAME_REACTANT_STOICH, DataSheet.COLTYPE_STRING, suffix);
		this.forceColumn(Experiment.COLNAME_REACTANT_MASS, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_REACTANT_VOLUME, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_REACTANT_MOLES, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_REACTANT_DENSITY, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_REACTANT_CONC, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_REACTANT_PRIMARY, DataSheet.COLTYPE_BOOLEAN, suffix);
	}
	private forceReagentColumns(suffix:number):void
	{
		this.forceColumn(Experiment.COLNAME_REAGENT_MOL, DataSheet.COLTYPE_MOLECULE, suffix);
		this.forceColumn(Experiment.COLNAME_REAGENT_NAME, DataSheet.COLTYPE_STRING, suffix);
		this.forceColumn(Experiment.COLNAME_REAGENT_EQUIV, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_REAGENT_MASS, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_REAGENT_VOLUME, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_REAGENT_MOLES, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_REAGENT_DENSITY, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_REAGENT_CONC, DataSheet.COLTYPE_REAL, suffix);
	}
	private forceProductColumns(suffix:number):void
	{
		this.forceColumn(Experiment.COLNAME_PRODUCT_MOL, DataSheet.COLTYPE_MOLECULE, suffix);
		this.forceColumn(Experiment.COLNAME_PRODUCT_NAME, DataSheet.COLTYPE_STRING, suffix);
		this.forceColumn(Experiment.COLNAME_PRODUCT_STOICH, DataSheet.COLTYPE_STRING, suffix);
		this.forceColumn(Experiment.COLNAME_PRODUCT_MASS, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_PRODUCT_VOLUME, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_PRODUCT_MOLES, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_PRODUCT_DENSITY, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_PRODUCT_CONC, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_PRODUCT_YIELD, DataSheet.COLTYPE_REAL, suffix);
		this.forceColumn(Experiment.COLNAME_PRODUCT_WASTE, DataSheet.COLTYPE_BOOLEAN, suffix);
	}

	private parseReactionMetaData(content:string):[number, number, number]
	{
		let nreactants = 1, nproducts = 1, nreagents = 0;
		
		for (let line of content.split(/\r?\n/))
		{
			if (line.startsWith('nreactants=')) nreactants = Math.max(nreactants, Math.min(100, parseInt(line.substring(11))));
			else if (line.startsWith('nproducts=')) nproducts = Math.max(nproducts, Math.min(100, parseInt(line.substring(10))));
			else if (line.startsWith('nreagents=')) nreagents = Math.max(nreagents, Math.min(100, parseInt(line.substring(10))));
		}
		
		return [nreactants, nproducts, nreagents];
	}

	// more convenient version of above which scans the header; for routine use, post-setup
	private countComponents():[number, number, number]
	{
		let nreactants = 0, nproducts = 0, nreagents = 0;
		for (let n = 0; n < this.ds.numExtensions; n++) if (this.ds.getExtType(n) == Experiment.CODE_RXN)
		{
			[nreactants, nproducts, nreagents] = this.parseReactionMetaData(this.ds.getExtData(n));
			break;
		}
		return [nreactants, nproducts, nreagents];
	}

	// pulls out the respective component types from the underlying fields
	private fetchReactant(row:number, idx:number):ExperimentComponent
	{
		let mol = this.ds.getMolecule(row, `${Experiment.COLNAME_REACTANT_MOL}${idx}`);
		let name = this.ds.getString(row, `${Experiment.COLNAME_REACTANT_NAME}${idx}`);
		if (MolUtil.isBlank(mol) && !name) return null;

		let comp = new ExperimentComponent(mol, name);
		let stoich = this.ds.getString(row, `${Experiment.COLNAME_REACTANT_STOICH}${idx}`);
		if (stoich) comp.stoich = stoich;
		comp.mass = this.ds.getReal(row, `${Experiment.COLNAME_REACTANT_MASS}${idx}`);
		comp.volume = this.ds.getReal(row, `${Experiment.COLNAME_REACTANT_VOLUME}${idx}`);
		comp.moles = this.ds.getReal(row, `${Experiment.COLNAME_REACTANT_MOLES}${idx}`);
		comp.density = this.ds.getReal(row, `${Experiment.COLNAME_REACTANT_DENSITY}${idx}`);
		comp.conc = this.ds.getReal(row, `${Experiment.COLNAME_REACTANT_CONC}${idx}`);
		let primary = this.ds.getBoolean(row, `${Experiment.COLNAME_REACTANT_PRIMARY}${idx}`);
		if (primary != null) comp.primary = primary;
		return comp;
	}
	private fetchProduct(row:number, idx:number):ExperimentComponent
	{
		let mol = this.ds.getMolecule(row, `${Experiment.COLNAME_PRODUCT_MOL}${idx}`);
		let name = this.ds.getString(row, `${Experiment.COLNAME_PRODUCT_NAME}${idx}`);
		if (MolUtil.isBlank(mol) && !name) return null;

		let comp = new ExperimentComponent(mol, name);
		let stoich = this.ds.getString(row, `${Experiment.COLNAME_PRODUCT_STOICH}${idx}`);
		if (stoich) comp.stoich = stoich;
		comp.mass = this.ds.getReal(row, `${Experiment.COLNAME_PRODUCT_MASS}${idx}`);
		comp.volume = this.ds.getReal(row, `${Experiment.COLNAME_PRODUCT_VOLUME}${idx}`);
		comp.moles = this.ds.getReal(row, `${Experiment.COLNAME_PRODUCT_MOLES}${idx}`);
		comp.density = this.ds.getReal(row, `${Experiment.COLNAME_PRODUCT_DENSITY}${idx}`);
		comp.conc = this.ds.getReal(row, `${Experiment.COLNAME_PRODUCT_CONC}${idx}`);
		let waste = this.ds.getBoolean(row, `${Experiment.COLNAME_PRODUCT_WASTE}${idx}`);
		if (waste != null) comp.waste = waste;
		return comp;
	}
	private fetchReagent(row:number, idx:number):ExperimentComponent
	{
		let mol = this.ds.getMolecule(row, `${Experiment.COLNAME_REAGENT_MOL}${idx}`);
		let name = this.ds.getString(row, `${Experiment.COLNAME_REAGENT_NAME}${idx}`);
		if (MolUtil.isBlank(mol) && !name) return null;

		let comp = new ExperimentComponent(mol, name);
		comp.mass = this.ds.getReal(row, `${Experiment.COLNAME_REAGENT_MASS}${idx}`);
		comp.volume = this.ds.getReal(row, `${Experiment.COLNAME_REAGENT_VOLUME}${idx}`);
		comp.moles = this.ds.getReal(row, `${Experiment.COLNAME_REAGENT_MOLES}${idx}`);
		comp.density = this.ds.getReal(row, `${Experiment.COLNAME_REAGENT_DENSITY}${idx}`);
		comp.conc = this.ds.getReal(row, `${Experiment.COLNAME_REAGENT_CONC}${idx}`);
		comp.equiv = this.ds.getReal(row, `${Experiment.COLNAME_REAGENT_EQUIV}${idx}`);
		return comp;
	}
	
	// returns the list of operations needed to "set" an entry: this may involve adjusting columns, modifying extensions,
	// and deleting/inserting rows... as well as replacing cell content
	private putEntry(row:number, entry:ExperimentEntry, replace:boolean):void
	{
		// make sure the metadata is in place
		let [preactants, pproducts, preagents] = this.countComponents();
		var [nreactants, nproducts, nreagents] = [preactants, pproducts, preagents];
		for (let step of entry.steps)
		{
			nreactants = Math.max(nreactants, step.reactants.length);
			nproducts = Math.max(nproducts, step.products.length);
			nreagents = Math.max(nreagents, step.reagents.length);
		}
		if (nreactants != preactants || nproducts != pproducts || nreagents != preagents)
		{
			let meta = `nreactants=${nreactants}\nnproducts=${nproducts}\nnreagents=${nreagents}`;
			let got = false;
			for (let n = 0; n < this.ds.numExtensions; n++) if (this.ds.getExtType(n) == Experiment.CODE_RXN)
			{
				this.ds.setExtData(n, meta);
				got = true;
				break;
			}
			if (!got) this.ds.appendExtension(Experiment.NAME_RXN, Experiment.CODE_RXN, meta);
		}

		// make sure all columns are present and of the right type
		for (let n = 1; n <= nreactants; n++) this.forceReactantColumns(n);
		for (let n = 1; n <= nreagents; n++) this.forceReagentColumns(n);
		for (let n = 1; n <= nproducts; n++) this.forceProductColumns(n);
		
		// sync up the number of steps, if necessary
		let oldSteps = replace ? this.numberOfSteps(row) : 0, newSteps = entry.steps.length;
		if (oldSteps > newSteps)
		{
			for (let n = newSteps; n < oldSteps; n++) this.ds.deleteRow(row + newSteps - 1);
		}
		else if (newSteps > oldSteps)
		{
			for (let n = oldSteps; n < newSteps; n++) this.ds.insertRow(row + oldSteps);
		}
		
		// emit the header
		this.ds.setString(row, Experiment.COLNAME_EXPERIMENT_TITLE, entry.title);
		this.ds.setReal(row, Experiment.COLNAME_EXPERIMENT_CREATEDATE, entry.createDate == null ? null : entry.createDate.getTime() * 1E-3);
		this.ds.setReal(row, Experiment.COLNAME_EXPERIMENT_MODIFYDATE, entry.modifyDate == null ? null : entry.modifyDate.getTime() * 1E-3);
		this.ds.setString(row, Experiment.COLNAME_EXPERIMENT_DOI, entry.doi);

		// emit the steps and components
		for (let s = 0; s < entry.steps.length; s++)
		{
			let r = row + s;
			if (s == 0) for (let n = 0; n < entry.steps[s].reactants.length; n++)
			{
				let comp = entry.steps[s].reactants[n], i = n + 1;
				this.ds.setMolecule(r, `${Experiment.COLNAME_REACTANT_MOL}${i}`, comp.mol);
				this.ds.setString(r, `${Experiment.COLNAME_REACTANT_NAME}${i}`, comp.name);
				this.ds.setString(r, `${Experiment.COLNAME_REACTANT_STOICH}${i}`, comp.stoich);
				this.ds.setReal(r, `${Experiment.COLNAME_REACTANT_MASS}${i}`, comp.mass);
				this.ds.setReal(r, `${Experiment.COLNAME_REACTANT_VOLUME}${i}`, comp.volume);
				this.ds.setReal(r, `${Experiment.COLNAME_REACTANT_MOLES}${i}`, comp.moles);
				this.ds.setReal(r, `${Experiment.COLNAME_REACTANT_DENSITY}${i}`, comp.density);
				this.ds.setReal(r, `${Experiment.COLNAME_REACTANT_CONC}${i}`, comp.conc);
				this.ds.setBoolean(r, `${Experiment.COLNAME_REACTANT_PRIMARY}${i}`, comp.primary);
			}
			for (let n = 0; n < entry.steps[s].reagents.length; n++)
			{
				let comp = entry.steps[s].reagents[n], i = n + 1;
				this.ds.setMolecule(r, `${Experiment.COLNAME_REAGENT_MOL}${i}`, comp.mol);
				this.ds.setString(r, `${Experiment.COLNAME_REAGENT_NAME}${i}`, comp.name);
				this.ds.setReal(r, `${Experiment.COLNAME_REAGENT_EQUIV}${i}`, comp.equiv);
				this.ds.setReal(r, `${Experiment.COLNAME_REAGENT_MASS}${i}`, comp.mass);
				this.ds.setReal(r, `${Experiment.COLNAME_REAGENT_VOLUME}${i}`, comp.volume);
				this.ds.setReal(r, `${Experiment.COLNAME_REAGENT_MOLES}${i}`, comp.moles);
				this.ds.setReal(r, `${Experiment.COLNAME_REAGENT_DENSITY}${i}`, comp.density);
				this.ds.setReal(r, `${Experiment.COLNAME_REAGENT_CONC}${i}`, comp.conc);
			}
			for (let n = 0; n < entry.steps[s].products.length; n++)
			{
				let comp = entry.steps[s].products[n], i = n + 1;
				this.ds.setMolecule(r, `${Experiment.COLNAME_PRODUCT_MOL}${i}`, comp.mol);
				this.ds.setString(r, `${Experiment.COLNAME_PRODUCT_NAME}${i}`, comp.name);
				this.ds.setString(r, `${Experiment.COLNAME_PRODUCT_STOICH}${i}`, comp.stoich);
				this.ds.setReal(r, `${Experiment.COLNAME_PRODUCT_MASS}${i}`, comp.mass);
				this.ds.setReal(r, `${Experiment.COLNAME_PRODUCT_VOLUME}${i}`, comp.volume);
				this.ds.setReal(r, `${Experiment.COLNAME_PRODUCT_MOLES}${i}`, comp.moles);
				this.ds.setReal(r, `${Experiment.COLNAME_PRODUCT_DENSITY}${i}`, comp.density);
				this.ds.setReal(r, `${Experiment.COLNAME_PRODUCT_CONC}${i}`, comp.conc);
				this.ds.setBoolean(r, `${Experiment.COLNAME_PRODUCT_WASTE}${i}`, comp.waste);
			}
		}
		
		// trash anything beyond the incoming limits
		for (let s = 0; s < entry.steps.length; s++)
		{
			let r = row + s;
			let start = s > 0 ? 0 : entry.steps[s].reactants.length;
			for (let n = start; n < nreactants; n++)
			{
				let i = n + 1;
				this.ds.setToNull(r, `${Experiment.COLNAME_REACTANT_MOL}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_REACTANT_NAME}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_REACTANT_STOICH}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_REACTANT_MASS}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_REACTANT_VOLUME}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_REACTANT_MOLES}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_REACTANT_DENSITY}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_REACTANT_CONC}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_REACTANT_PRIMARY}${i}`);
			}
			for (let n = entry.steps[s].reagents.length; n < nreagents; n++)
			{
				let i = n + 1;
				this.ds.setToNull(r, `${Experiment.COLNAME_REAGENT_MOL}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_REAGENT_NAME}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_REAGENT_EQUIV}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_REAGENT_MASS}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_REAGENT_VOLUME}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_REAGENT_MOLES}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_REAGENT_DENSITY}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_REAGENT_CONC}${i}`);
			}
			for (let n = entry.steps[s].products.length; n < nproducts; n++)
			{
				let i = n + 1;
				this.ds.setToNull(r, `${Experiment.COLNAME_PRODUCT_MOL}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_PRODUCT_NAME}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_PRODUCT_STOICH}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_PRODUCT_MASS}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_PRODUCT_VOLUME}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_PRODUCT_MOLES}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_PRODUCT_DENSITY}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_PRODUCT_CONC}${i}`);
				this.ds.setToNull(r, `${Experiment.COLNAME_PRODUCT_WASTE}${i}`);
			}
		}
	}

    // ------------------ aspect implementation --------------------

	public plainHeading():string {return Experiment.NAME;}
	
	public rowFirstBlock(row:number):boolean {return this.isFirstStep(row);}
	public rowBlockCount(row:number):number {return this.numberOfSteps(row);}

	public isColumnReserved(colName:string):boolean 
	{
		return this.areColumnsReserved([colName])[0];
	}
	
	public areColumnsReserved(colNames:string[]):boolean[]
	{
		let LITERALS =
		[
			Experiment.COLNAME_EXPERIMENT_TITLE,
			Experiment.COLNAME_EXPERIMENT_CREATEDATE,
			Experiment.COLNAME_EXPERIMENT_MODIFYDATE,
			Experiment.COLNAME_EXPERIMENT_DOI
		];
		let PREFIXES =
		[
			Experiment.COLNAME_REACTANT_MOL,
			Experiment.COLNAME_REACTANT_NAME,
			Experiment.COLNAME_REACTANT_STOICH,
			Experiment.COLNAME_REACTANT_MASS,
			Experiment.COLNAME_REACTANT_VOLUME,
			Experiment.COLNAME_REACTANT_MOLES,
			Experiment.COLNAME_REACTANT_DENSITY,
			Experiment.COLNAME_REACTANT_CONC,
			Experiment.COLNAME_REACTANT_PRIMARY,
			Experiment.COLNAME_REAGENT_MOL,
			Experiment.COLNAME_REAGENT_NAME,
			Experiment.COLNAME_REAGENT_EQUIV,
			Experiment.COLNAME_REAGENT_MASS,
			Experiment.COLNAME_REAGENT_VOLUME,
			Experiment.COLNAME_REAGENT_MOLES,
			Experiment.COLNAME_REAGENT_DENSITY,
			Experiment.COLNAME_REAGENT_CONC,
			Experiment.COLNAME_PRODUCT_MOL,
			Experiment.COLNAME_PRODUCT_NAME,
			Experiment.COLNAME_PRODUCT_STOICH,
			Experiment.COLNAME_PRODUCT_MASS,
			Experiment.COLNAME_PRODUCT_VOLUME,
			Experiment.COLNAME_PRODUCT_MOLES,
			Experiment.COLNAME_PRODUCT_DENSITY,
			Experiment.COLNAME_PRODUCT_CONC,
			Experiment.COLNAME_PRODUCT_YIELD,
			Experiment.COLNAME_PRODUCT_WASTE
		];
	
		let resv = Vec.booleanArray(false, colNames.length);
		for (let n = 0; n < colNames.length; n++)
		{
			let name = colNames[n];
			if (LITERALS.indexOf(name) >= 0)
			{
				resv[n] = true;
				continue;
			}
			for (let pfx of PREFIXES) if (name.startsWith(pfx))
			{
				resv[n] = true;
				break;
			}
		}
		
		return resv;		
	}
	
	
/*	open override func numTextRenderings(row:Int) -> Int {return 1}
	open override func produceTextRendering(row:Int, idx:Int) -> (name:String, descr:String, text:String)
	{
		var retName = "", retDescr = "", retText = ""
		data.observe() {(ds:DataSheet) in (retName, retDescr, retText) = self.produceTextRendering(row:row, idx:idx, ds:ds)}
		return (name:retName, descr:retDescr, text:retText)
	}
	open override func produceTextRendering(row:Int, idx:Int, ds:DataSheet) -> (name:String, descr:String, text:String)
	{
		assert(idx == 0, "Invalid index to Experiment.produceTextRendering")

		let entry = getEntry(row, ds:ds)
		var lines:[String] = []
		
		if !entry.title.isEmpty {lines.append("Title: \(entry.title)")}
		
		let datefmt = DateFormatter()
		datefmt.dateStyle = .medium
		datefmt.timeStyle = .medium
		
		if let createDate = entry.createDate {lines.append("Created: \(datefmt.string(from:createDate))")}
		if let modifyDate = entry.modifyDate {lines.append("Modified: \(datefmt.string(from:modifyDate))")}
		
		if !entry.doi.isEmpty {lines.append("DOI: \(entry.doi)")}
		
		let txt = lines.joined(separator:"\n")

		return (name:"Header", descr:"Experiment description and metadata", text:txt)
	}

	open override func numGraphicRenderings(row:Int) -> Int {return 3}
	open override func produceGraphicRendering(row:Int, idx:Int, policy:RenderPolicy, vg:VectorGfxBuilder) -> (name:String, vg:VectorGfxBuilder)
	{
		var retName = "", retVG = vg
		data.observe() {(ds:DataSheet) in (retName, retVG) = self.produceGraphicRendering(row:row, idx:idx, policy:policy, vg:vg, ds:ds)}
		return (name:retName, vg:retVG)
	}
	open override func produceGraphicRendering(row:Int, idx:Int, policy:RenderPolicy, vg:VectorGfxBuilder, ds:DataSheet) -> (name:String, vg:VectorGfxBuilder)
	{
		if idx == Render.Scheme
		{
			let entry = getEntry(row, ds:ds)
			let layout = ArrangeExperiment(entry:entry, measure:OutlineMeasurement(scale:policy.pointScale, yUp:false), policy:policy)

			layout.limitTotalW = 50 * policy.pointScale
			layout.limitTotalH = 50 * policy.pointScale
			layout.arrange()
			
			//vg.drawLine(x1:0, y1:0, x2:layout.width, y2:layout.height, colour:0xFF0000, thickness:1)
			let vgexp = DrawExperiment(layout:layout, vg:vg)
			vgexp.draw()
			
			return (name:"Scheme", vg:vg)
		}
		else if idx == Render.Quantity
		{
			let entry = getEntry(row, ds:ds)
			let layout = ArrangeExpQuant(entry:entry, measure:OutlineMeasurement(scale:policy.pointScale, yUp:false), policy:policy)
			layout.idealAspect = 1.4
			layout.arrange()
			layout.render(vg)
		}
		else if idx == Render.Metrics
		{
			let entry = getEntry(row, ds:ds)
			let layout = ArrangeExpMetrics(entry:entry, measure:OutlineMeasurement(scale:policy.pointScale, yUp:false), policy:policy)
			layout.idealAspect = 1.4
			layout.arrange()
			layout.render(vg)
		}
		return (name:"", vg:vg)
	}

	// creating a new row: need to set the ExperimentCreateDate in order to demarck the multistep boundary
	open override func initiateNewRow(ds:DataSheet, ops:[DataContainer.Op], row:Int) -> [DataContainer.Op]
	{
		let ds = DataSheetHolder(ds:ds, inclData:false, inclExtn:false)
		DataContainer.applyColumnOperations(ds:ds, ops:ops)
		
		var ncols = ds.numCols
		var ret:[DataContainer.Op] = self.forceColumn(ds, ncols:&ncols, name:ColName.ExperimentCreateDate, suffix:0, type:ColType.Real)
		DataContainer.applyColumnOperations(ds:ds, ops:ret)

		let colidx = ds.findColByName(ColName.ExperimentCreateDate, type:ColType.Real)
		let createReal:Double = Date().timeIntervalSince1970
		ret.append(DataContainer.Op.makeSetCell(row:row, col:colidx, datum:createReal))
		
		return ret
	}*/	
}
	