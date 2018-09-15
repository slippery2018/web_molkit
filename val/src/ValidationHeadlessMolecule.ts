/*
    WebMolKit

    (c) 2010-2016 Molecular Materials Informatics, Inc.

    All rights reserved
    
    http://molmatinf.com

	[PKG=webmolkit]
*/

///<reference path='../../src/util/util.ts'/>
///<reference path='../../src/util/Vec.ts'/>
///<reference path='../../src/data/Molecule.ts'/>
///<reference path='../../src/data/MetaMolecule.ts'/>
///<reference path='../../src/data/MoleculeStream.ts'/>
///<reference path='../../src/data/DataSheetStream.ts'/>
///<reference path='../../src/data/Stereochemistry.ts'/>
///<reference path='Validation.ts'/>

namespace WebMolKit /* BOF */ {

/*
    Headless validation: molecule tests - algorithms that apply to molecular connection tables.
*/

export class ValidationHeadlessMolecule extends Validation
{
	private strSketchEl:string;
	private strMolfile:string;
	private strDataXML:string;
	private strSDfile:string;
	private molStereo:Molecule;
	private dsCircular:DataSheet;

	constructor(private urlBase:string)
	{
		super();
		this.add('Parse SketchEl molecule (native format)', this.parseSketchEl);
		this.add('Parse MDL Molfile', this.parseMolfile);
		this.add('Parse DataSheet XML', this.parseDataXML);
		this.add('Parse MDL SDfile', this.parseSDfile);
		this.add('Calculate strict aromaticity', this.calcStrictArom);
		this.add('Calculate stereochemistry', this.calcStereoChem);
		this.add('Circular ECFP6 fingerprints', this.calcFingerprints);
	}

    public init(donefunc:() => void):void
    {
		const self = this;

		let FILES = ['molecule.el', 'molecule.mol', 'datasheet.ds', 'datasheet.sdf', 'stereo.el', 'circular.ds'];
		let files = FILES;

		let fetchResult = function(data:string):void
		{
			let fn = files.shift();
			if (fn == 'molecule.el') self.strSketchEl = data;
			else if (fn == 'molecule.mol') self.strMolfile = data;
			else if (fn == 'datasheet.ds') self.strDataXML = data;
			else if (fn == 'datasheet.sdf') self.strSDfile = data;
			else if (fn == 'stereo.el') self.molStereo = Molecule.fromString(data);
			else if (fn == 'circular.ds') self.dsCircular = DataSheetStream.readXML(data);

			if (files.length > 0)
				$.get(self.urlBase + files[0], fetchResult);
			else
				donefunc.call(self);
		}
		$.get(self.urlBase + files[0], fetchResult);
    }

	public parseSketchEl()
	{
		this.assert(!!this.strSketchEl, 'molecule not loaded');
		let mol = MoleculeStream.readNative(this.strSketchEl);
		this.assert(mol != null, 'parsing failed');
		this.assert(mol.numAtoms == 10 && mol.numBonds == 10, 'wrong atom/bond count');
		//console.log(this.strSketchEl);
	}

	public parseMolfile()
	{
		this.assert(!!this.strMolfile, 'molecule not loaded');
		let mol = MoleculeStream.readMDLMOL(this.strMolfile);
		this.assert(mol != null, 'parsing failed');
		this.assert(mol.numAtoms == 10 && mol.numBonds == 10, 'wrong atom/bond count');
		//console.log(this.strMolfile);
	}

	public parseDataXML()
	{
		this.assert(!!this.strDataXML, 'datasheet not loaded');
		let ds = DataSheetStream.readXML(this.strDataXML);
		this.assert(ds != null, 'parsing failed');
		this.assert(ds.numRows == 2 && ds.numCols == 5, 'wrong row/column count');
		let colTypes = [DataSheet.COLTYPE_MOLECULE, DataSheet.COLTYPE_STRING, DataSheet.COLTYPE_INTEGER, DataSheet.COLTYPE_REAL, DataSheet.COLTYPE_BOOLEAN];
		for (let n = 0; n < colTypes.length; n++) this.assert(ds.colType(n) == colTypes[n], 'column#' + (n + 1) + ' wrong type');
		
		this.assert(ds.getMolecule(0, 0).numAtoms == 1, 'row 1: invalid molecule');
		this.assert(ds.getString(0, 1) == 'string', 'row 1: invalid string');
		this.assert(ds.getInteger(0, 2) == 1, 'row 1: invalid integer');
		this.assert(ds.getReal(0, 3) == 1.5, 'row 1: invalid real');
		this.assert(ds.getBoolean(0, 4) == true, 'row 1: invalid boolean');

		this.assert(ds.getMolecule(1, 0).numAtoms == 1, 'row 2: invalid molecule');
		for (let n = 1; n < ds.numCols; n++) this.assert(ds.isNull(1, n), 'row 2, column#' + (n + 1) + ' supposed to be null');		
	}

	public parseSDfile()
	{
		this.assert(!!this.strSDfile, 'datasheet not loaded');
		let rdr = new MDLSDFReader(this.strSDfile);
		rdr.parse();
		let ds = rdr.ds;
		this.assert(ds != null, 'parsing failed');
		this.assert(ds.numRows == 2 && ds.numCols == 5, 'wrong row/column count');
		let colTypes = [DataSheet.COLTYPE_MOLECULE, DataSheet.COLTYPE_STRING, DataSheet.COLTYPE_INTEGER, DataSheet.COLTYPE_REAL, DataSheet.COLTYPE_BOOLEAN];

		for (let n = 0; n < colTypes.length; n++) this.assert(ds.colType(n) == colTypes[n], 'column#' + (n + 1) + ' wrong type');
		
		this.assert(ds.getMolecule(0, 0).numAtoms == 1, 'row 1: invalid molecule');
		this.assert(ds.getString(0, 1) == 'string', 'row 1: invalid string');
		this.assert(ds.getInteger(0, 2) == 1, 'row 1: invalid integer');
		this.assert(ds.getReal(0, 3) == 1.5, 'row 1: invalid real');
		this.assert(ds.getBoolean(0, 4) == true, 'row 1: invalid boolean');

		this.assert(ds.getMolecule(1, 0).numAtoms == 1, 'row 2: invalid molecule');
		for (let n = 1; n < ds.numCols; n++) this.assert(ds.isNull(1, n), 'row 2, column#' + (n + 1) + ' supposed to be null');		
	}

	public calcStrictArom()
	{
		this.assert(this.molStereo != null, 'molecule not loaded');
		let meta = MetaMolecule.createStrict(this.molStereo);
		this.assert(meta.atomArom != null, 'no aromaticity obtained');
		for (let n = 1; n <= 10; n++) this.assert(meta.isAtomAromatic(n), 'atom #' + n + ' supposed to be aromatic');
		for (let n = 1; n <= 10; n++) this.assert(meta.isBondAromatic(n), 'bond #' + n + ' supposed to be aromatic');
	}

	public calcStereoChem()
	{
		this.assert(this.molStereo != null, 'molecule not loaded');
		let meta = MetaMolecule.createStrictRubric(this.molStereo);
		this.assert(meta.rubricTetra != null, 'no tetrahedral rubric obtained');
		this.assert(meta.rubricSides != null, 'no cis/trans rubric obtained');
		let stereo = Stereochemistry.create(meta);
		
		let tet11 = stereo.atomTetraChirality(11); 
		this.assert(tet11 == Stereochemistry.STEREO_NEG, 'atom 11: incorrect stereochemistry, got ' + tet11);
		let tet19 = stereo.atomTetraChirality(19);
		this.assert(tet19 == Stereochemistry.STEREO_POS, 'atom 19: incorrect stereochemistry, got ' + tet19);
		let tet20 = stereo.atomTetraChirality(20);
		this.assert(tet20 == Stereochemistry.STEREO_POS, 'atom 20: incorrect stereochemistry, got ' + tet20);
		let side26 = stereo.bondSideStereo(26);
		this.assert(side26 == Stereochemistry.STEREO_NEG, 'bond 26: incorrect stereochemistry, got ' + side26);
	}

	public calcFingerprints()
	{
		this.assert(this.dsCircular != null, 'datasheet not loaded');
		
		const ds = this.dsCircular;
		for (let n = 0; n < ds.numRows; n++)
		{
			let mol = ds.getMolecule(n, 'Molecule');
			let ecfp0:number[] = [], ecfp2:number[] = [], ecfp4:number[] = [], ecfp6:number[] = [];
			for (let fp of ds.getString(n, 'ECFP0').split(',')) if (fp.length > 0) ecfp0.push(parseInt(fp));
			for (let fp of ds.getString(n, 'ECFP2').split(',')) if (fp.length > 0) ecfp2.push(parseInt(fp));
			for (let fp of ds.getString(n, 'ECFP4').split(',')) if (fp.length > 0) ecfp4.push(parseInt(fp));
			for (let fp of ds.getString(n, 'ECFP6').split(',')) if (fp.length > 0) ecfp6.push(parseInt(fp));
			Vec.sort(ecfp0);
			Vec.sort(ecfp2);
			Vec.sort(ecfp4);
			Vec.sort(ecfp6);

			let circ = CircularFingerprints.create(mol, CircularFingerprints.CLASS_ECFP6);
			let got:number[][] = [[], [], [], []];
			for (let fp of circ.getFingerprints()) if (got[fp.iteration].indexOf(fp.hashCode) < 0) got[fp.iteration].push(fp.hashCode);
			for (let ecfp of got) Vec.sort(ecfp);

			this.assert(Vec.equals(ecfp0, got[0]), 'row#' + (n + 1) + ', iter#0: wanted ' + ecfp0 + ', got ' + got[0]);
			this.assert(Vec.equals(ecfp2, got[1]), 'row#' + (n + 1) + ', iter#1: wanted ' + ecfp2 + ', got ' + got[1]);
			this.assert(Vec.equals(ecfp4, got[2]), 'row#' + (n + 1) + ', iter#2: wanted ' + ecfp4 + ', got ' + got[2]);
			this.assert(Vec.equals(ecfp6, got[3]), 'row#' + (n + 1) + ', iter#3: wanted ' + ecfp6 + ', got ' + got[3]);
		}
	}
}

/* EOF */ }