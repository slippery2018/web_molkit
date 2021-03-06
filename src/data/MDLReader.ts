/*
	WebMolKit

	(c) 2010-2018 Molecular Materials Informatics, Inc.

	All rights reserved
	
	http://molmatinf.com

	[PKG=webmolkit]
*/

///<reference path='../decl/corrections.d.ts'/>
///<reference path='../util/util.ts'/>
///<reference path='../data/CoordUtil.ts'/>
///<reference path='OpenMolSpec.ts'/>

namespace WebMolKit /* BOF */ {

/*
	MDL Molfile reader: a somewhat flexible input parser that can turn V2000 and V3000 Molfiles into the internal molecule
	representation. The molfile format has several official variants, and a much larger number of mutant strains that
	exist in the wild: mileage may vary. If the structure is unreadable, an exception will be thrown. For information on
	anything interesting that happened during the parsing process, consult the "openmol" member.

	MDL SDfile reader: doing the best it can to pull out the auxiliary fields in SDfiles, which can be abused in endless ways,
	but one does one's best to deal with it.
*/

// valence options used by MDL/CTAB, which is much more promiscuous than the internal format
export const MDLMOL_VALENCE:{[id:string] : number[]} =
{
	'H':  [1],
	'B':  [3],
	'C':  [4],
	'Si': [4],
	'N':  [3],
	'P':  [3, 5],
	'As': [3, 5],
	'O':  [2],
	'S':  [2, 4, 6],
	'Se': [2, 4, 6],
	'Te': [2, 4, 6],
	'F':  [1],
	'Cl': [1, 3, 5, 7],
	'Br': [1],
	'I':  [1, 3, 5, 7],
	'At': [1, 3, 5, 7],
};

export class MDLMOLReader
{
	// options
	public parseHeader = true; // if on, the first 3 lines are the pre-ctab header
	public parseExtended = true; // if on, extended fields are parsed; otherwise legacy MDL
	public allowV3000 = true; // if on, will diverge to a separate track for V3000
	public considerRescale = true; // if on, bond lengths will be rescaled if they are funky
	public relaxed = false; // set this to true to read some not-so-valid MOLfiles
	public keepAromatic = false; // set this to retain "type 4" bonds with foreign annotation, instead of de-rezzing
	public keepParity = false; // set this to bring in the "parity" labels for atoms

	// deliverables
	public mol:Molecule = null; // the result (or partial result, if not successful)
	public molName = ''; // molecule name from the header, if any
	public openmol = new OpenMolSpec();
	
	// hydrogen count & resonance bonds supposed to be query-only, but some software abuses them to get around the structural limitations
	public atomHyd:number[] = null;
	public resBonds:boolean[] = null;

	private pos = 0;
	private lines:string[];

	// ----------------- public methods -----------------

	constructor(strData:string)
	{
		this.lines = strData.split(/\r?\n/);
	}

	// perform the parsing operation, and populate the result fields
	public parse():Molecule
	{
		if (this.parseHeader)
		{
			this.molName = this.lines[0];
			if (this.molName)
			{
				let src:OpenMolSource = {'row': 0, 'col': 0, 'len': this.molName.length};
				this.openmol.add(OpenMolType.MoleculeName, null, null, [src]);
			}
			this.pos = 3;
		}
		this.parseCTAB();
		return this.mol;
	}
	
	// ----------------- private methods -----------------
	
	private nextLine():string
	{
		if (this.pos >= this.lines.length) throw 'MDL Molfile parser: premature end, at line ' + (this.pos + 1);
		return this.lines[this.pos++];
	}

	// pull out the main CTAB block: this is where the real action is
	private parseCTAB():void
	{
		this.mol = new Molecule();
		this.mol.keepTransient = true;

		// check out the counts line
		let line = this.nextLine();
		if (!this.relaxed)
		{
			let version = line.length >= 39 ? line.substring(34, 39) : '';
			if (this.allowV3000 && version == 'V3000')
			{
				this.parseV3000();
				this.openmol.derive(this.mol);
				return;
			}
			if (version != 'V2000') throw 'Invalid MDL MOL: no Vx000 tag.';
		}
		let numAtoms = parseInt(line.substring(0, 3).trim());
		let numBonds = parseInt(line.substring(3, 6).trim());
		let explicitValence:number[] = [];

		// read out each atom
		for (let n = 0; n < numAtoms; n++)
		{
			line = this.nextLine();
			if (line.length < 39) throw 'Invalid MDL MOL: atom line' + (n + 1);

			let x = parseFloat(line.substring(0, 10).trim());
			let y = parseFloat(line.substring(10, 20).trim());
			let z = parseFloat(line.substring(20, 30).trim());
			let el = line.substring(31, 34).trim();
			let chg = parseInt(line.substring(36, 39).trim()), rad = 0;
			let stereo = line.length < 42 ? 0 : parseInt(line.substring(39, 42).trim());
			let hyd = line.length < 45 ? 0 : parseInt(line.substring(42, 45).trim());
			let val = line.length < 51 ? 0 : parseInt(line.substring(48, 51).trim());
			let mapnum = line.length < 63 ? 0 : parseInt(line.substring(60,63).trim());
	
			if (chg >= 1 && chg <= 3) chg = 4 - chg;
			else if (chg == 4) {chg = 0; rad = 2;}
			else if (chg >= 5 && chg <= 7) chg = 4 - chg;
			else chg = 0;

			let a = this.mol.addAtom(el, x, y, chg, rad);
			if (z != 0)
			{
				this.mol.setAtomZ(a, z);
				this.mol.setIs3D(true);
			}
			this.mol.setAtomMapNum(a, mapnum);
			
			/* todo: add in Z-support to molecule class
			if (z != 0)
			{
				this.mol.setIs3D(true);
				this.mol.setAtomZ(a, z);
			}*/
			
			if (hyd > 0)
			{
				this.openmol.addJoin(OpenMolType.QueryHCount, [a]);

				if (this.atomHyd == null) this.atomHyd = Vec.numberArray(Molecule.HEXPLICIT_UNKNOWN, numAtoms);
				this.atomHyd[n] = hyd - 1;
			}
			
			if (stereo > 0 && this.keepParity)
			{
				/* todo: retained parity flags
				let trans = this.mol.atomTransient(a);
				if (stereo == 1) this.mol.setAtomTransient(a, Vec.append(trans, ForeignMolecule.ATOM_CHIRAL_MDL_ODD));
				else if (stereo == 2) this.mol.setAtomTransient(a, Vec.append(trans, ForeignMolecule.ATOM_CHIRAL_MDL_EVEN));
				else if (stereo == 3) this.mol.setAtomTransient(a, Vec.append(trans, ForeignMolecule.ATOM_CHIRAL_MDL_RACEMIC));
				*/
			}

			explicitValence.push(val);
		}

		// read out each bond
		for (let n = 0; n < numBonds; n++)
		{
			line = this.nextLine();
			if (line.length < 12) throw 'Invalid MDL MOL: bond line' + (n + 1);

			let bfr = parseInt(line.substring(0, 3).trim()), bto = parseInt(line.substring(3, 6).trim());
			let type = parseInt(line.substring(6, 9).trim()), stereo = parseInt(line.substring(9, 12).trim());

			if (bfr == bto || bfr < 1 || bfr > numAtoms || bto < 1 || bto > numAtoms) throw 'Invalid MDL MOL: bond line' + (n +1);
	
			let order = type >= 1 && type <= 3 ? type : 1;
			let style = Molecule.BONDTYPE_NORMAL;
			if (stereo == 1) style = Molecule.BONDTYPE_INCLINED;
			else if (stereo == 6) style = Molecule.BONDTYPE_DECLINED;
			else if (stereo == 4) style = Molecule.BONDTYPE_UNKNOWN;
	
			let b = this.mol.addBond(bfr, bto, order, style);
			
			// type "4" is special: it is defined to be a special query type to match aromatic bonds, but it is sometimes used
			// to store actual molecules; in this case, it is necessary to either "deresonate" the rings, or to stash the property
			if (type == 4)
			{
				let src:OpenMolSource = {'row': this.pos - 1, 'col': 6, 'len': 3};
				this.openmol.addJoin(OpenMolType.QueryResonance, null, [b], [src]);

				/* todo: handle the technically incorrect 'aromatic' type
				if (this.keepAromatic) this.mol.setBondTransient(b, Vec.append(mol.bondTransient(b), ForeignMolecule.BOND_AROMATIC));
				else
				{
					if (this.resBonds == null) this.resBonds = Vec.booleanArray(false, numBonds);
					this.resBonds[n] = true;
				}*/
			}
		}    	    
		
		// examine anything in the M-block
		const MBLK_CHG = 1, MBLK_RAD = 2, MBLK_ISO = 3, MBLK_RGP = 4, MBLK_HYD = 5, MBLK_ZCH = 6, MBLK_ZBO = 7, MBLK_ZPA = 8, MBLK_ZRI = 9, MBLK_ZAR = 10;
		let resPaths = new Map<number, number[]>(), resRings = new Map<number, number[]>(), arenes = new Map<number, number[]>();
		while (true)
		{
			line = this.nextLine();
			if (line.startsWith('M  END')) break;

			let type = 0;
			if (line.startsWith('M  CHG')) type = MBLK_CHG;
			else if (line.startsWith('M  RAD')) type = MBLK_RAD;
			else if (line.startsWith('M  ISO')) type = MBLK_ISO;
			else if (line.startsWith('M  RGP')) type = MBLK_RGP;
			else if (this.parseExtended && line.startsWith('M  HYD')) type = MBLK_HYD;
			else if (this.parseExtended && line.startsWith('M  ZCH')) type = MBLK_ZCH;
			else if (this.parseExtended && line.startsWith('M  ZBO')) type = MBLK_ZBO;
			else if (this.parseExtended && line.startsWith('M  ZPA')) type = MBLK_ZPA;
			else if (this.parseExtended && line.startsWith('M  ZRI')) type = MBLK_ZRI;
			else if (this.parseExtended && line.startsWith('M  ZAR')) type = MBLK_ZAR;
			else if (line.startsWith('A  ') && line.length >= 6)
			{
				let anum = parseInt(line.substring(3, 6).trim());
				if (anum >= 1 && anum <= this.mol.numAtoms)
				{
					line = this.nextLine();
					if (line == null) break;
					this.mol.setAtomElement(anum, line);
					continue;
				}
			}

			if (type == MBLK_ZPA || type == MBLK_ZRI || type == MBLK_ZAR)
			{
				let len = parseInt(line.substring(6, 9).trim()), blk = parseInt(line.substring(9, 13).trim());
				let map = type == MBLK_ZPA ? resPaths : type == MBLK_ZRI ? resRings : /* type == MBLK_ZAR */ arenes;
				for (let n = 0; n < len; n++)
				{
					let val = parseInt(line.substring(13 + 4 * n, 17 + 4 * n).trim());
					if (val < 1 || val > numAtoms) throw 'Invalid MDL MOL: M-block';
					let atoms = map.get(blk);
					if (!atoms) map.set(blk, atoms = []);
					atoms.push(val);
				}
			}
			else if (type > 0)
			{
				let len = parseInt(line.substring(6, 9).trim());
				for (let n = 0; n < len; n++)
				{
					let pos = parseInt(line.substring(9 + 8 * n, 13 + 8 * n).trim());
					let val = parseInt(line.substring(13 + 8 * n, 17 + 8 * n).trim());
					if (pos < 1) throw 'Invalid MDL MOL: M-block';

					if (type == MBLK_CHG) this.mol.setAtomCharge(pos, val);
					else if (type == MBLK_RAD) this.mol.setAtomUnpaired(pos, val);
					else if (type == MBLK_ISO) this.mol.setAtomIsotope(pos, val);
					else if (type == MBLK_RGP) this.mol.setAtomElement(pos, "R" + val);
					else if (type == MBLK_HYD) 
					{
						this.mol.setAtomHExplicit(pos, val);
						let src:OpenMolSource = {'row': this.pos - 1, 'col': 9 + 8 * n, 'len': 8};
						this.openmol.addJoin(OpenMolType.HydrogenCounting, [pos], null, [src]);
					}
					else if (type == MBLK_ZCH) this.mol.setAtomCharge(pos, val);
					else if (type == MBLK_ZBO) 
					{
						this.mol.setBondOrder(pos, val);
						let src:OpenMolSource = {'row': this.pos - 1, 'col': 9 + 8 * n, 'len': 8};
						this.openmol.addJoin(OpenMolType.ZeroOrderBonds, null, [pos], [src]);
					}
				}
			}
		}
		
		this.postFix(explicitValence);

		if (this.parseExtended)
		{
			let artifacts = new BondArtifact(this.mol);
			for (let atoms of resPaths.values()) artifacts.createPath(atoms);
			for (let atoms of resRings.values()) artifacts.createRing(atoms);
			for (let atoms of arenes.values()) artifacts.createArene(atoms);
			artifacts.rewriteMolecule();
		}

		this.openmol.derive(this.mol);
	}
		
	// performs some intrinsic post-parse fixing
	private postFix(explicitValence:number[]):void
	{
		const mol = this.mol;

		// post-fixing
		for (let n = 1; n <= mol.numAtoms; n++)
		{
			let el = mol.atomElement(n);

			// shortcuts for isotope "elements"
			if (el == 'D') {mol.setAtomElement(n, 'H'); mol.setAtomIsotope(n, 2);}
			else if (el == 'T') {mol.setAtomElement(n, 'H'); mol.setAtomIsotope(n, 3);}

			// valence, two correction scenarios: (1) if set to explicit, make the hydrogens
			let valence = explicitValence[n - 1], options = MDLMOL_VALENCE[el];
			if (valence != 0)
			{
				let hcount = valence < 0 || valence > 14 ? 0 : valence;
				for (let b of mol.atomAdjBonds(n)) hcount -= mol.bondOrder(b);
				if (hcount != mol.atomHydrogens(n)) mol.setAtomHExplicit(n, hcount);
			}
			else if (options)
			{
				let chg = mol.atomCharge(n);
				let chgmod = (el == 'C' || el == 'H') ? Math.abs(chg) : el == 'B' ? -Math.abs(chg) : -chg;
				let usedValence = chgmod + mol.atomUnpaired(n);
				for (let b of mol.atomAdjBonds(n)) usedValence += mol.bondOrder(b);
				for (let v of options) if (usedValence <= v) 
				{
					let hcount = v - usedValence;
					if (hcount != mol.atomHydrogens(n)) mol.setAtomHExplicit(n, hcount);
					break;
				}
			}
		}

		if (this.considerRescale) CoordUtil.normaliseBondDistances(mol);
		
		/* ... to be done...
		if (resBonds != null)
		{
			ResonanceRemover derez = new ResonanceRemover(mol, resBonds, atomHyd);
			try {derez.perform();} catch (GraphFaultException ex) {throw new MoleculeIOException(ex);}
			int[] bo = derez.getBondOrders();
			final int nb = mol.numBonds;
			for (let n = 0; n < nb; n++) mol.setBondOrder(n + 1, bo[n]);
		}*/
		
		mol.keepTransient = false;
	}
	
	// alternate track: only look at the specially marked V3000 tags
	private parseV3000():void
	{
		// NOTE: this is currently very minimal
	
		let inCTAB = false, inAtom = false, inBond = false;
		let lineCounts:string = null;
		let lineAtoms:string[] = [], lineBonds:string[] = [];
		
		const ERRPFX = 'Invalid MDL MOL V3000: ';
		
		while (true)
		{
			let line = this.nextLine();
			if (line == 'M  END') break; // graceful end

			if (!line.startsWith('M  V30 ')) continue;
			line = line.substring(7);
			
			if (line.startsWith('COUNTS ')) lineCounts = line.substring(7);
			else if (line.startsWith('BEGIN CTAB')) inCTAB = true;
			else if (line.startsWith('END CTAB')) inCTAB = false;
			else if (line.startsWith('BEGIN ATOM')) inAtom = true;
			else if (line.startsWith('END ATOM')) inAtom = false;
			else if (line.startsWith('BEGIN BOND')) inBond = true;
			else if (line.startsWith('END BOND')) inBond = false;
			// TO DO: make sure these are nested properly, bug out if not
			else if (inCTAB && inAtom && !inBond) lineAtoms.push(line);
			else if (inCTAB && inBond && !inAtom) lineBonds.push(line);
			// (silently ignore other stuff; don't care)
		}
		
		let counts = lineCounts.split('\\s+');
		if (counts.length < 2) throw ERRPFX + 'counts line malformatted';
		let numAtoms = parseInt(counts[0]), numBonds = parseInt(counts[1]);
		if (numAtoms < 0 || numAtoms > lineAtoms.length) throw ERRPFX + 'unreasonable atom count: ' + numAtoms;
		if (numBonds < 0 || numBonds > lineBonds.length) throw ERRPFX + 'unreasonable bond count: ' + numBonds;

		let atomBits:string[][] = [], bondBits:string[][] = [];
		
		for (let n = 0; n < lineAtoms.length; n++)
		{
			let line = lineAtoms[n];
			while (n < lineAtoms.length - 1 && line.endsWith('-'))
			{
				n++;
				line = line.substring(0, line.length - 1) + lineAtoms[n];
			}
			let bits = this.splitWithQuotes(line);
			if (bits.length < 6) throw ERRPFX + 'atom line has too few components: ' + line;
			let idx = parseInt(bits[0], 0);
			if (idx < 1 || idx > numAtoms) throw ERRPFX + 'invalid atom index: ' + bits[0];
			if (atomBits[idx - 1] != null) throw ERRPFX + 'duplicate atom index: ' + idx;
			atomBits[idx - 1] = bits;
		}
		
		for (let n = 0; n < lineBonds.length; n++)
		{
			let line = lineBonds[n];
			while (n < lineBonds.length - 1 && line.endsWith('-'))
			{
				n++;
				line = line.substring(0, line.length - 1) + lineBonds[n];
			}
			let bits = this.splitWithQuotes(line);
			if (bits.length < 4) throw ERRPFX + 'bond line has too few components: ' + line;
			let idx = parseInt(bits[0], 0);
			if (idx < 1 || idx > numBonds) throw ERRPFX + 'invalid bond index: ' + bits[0];
			if (bondBits[idx - 1] != null) throw ERRPFX + 'duplicate bond index: ' + idx;
			bondBits[idx - 1] = bits;
		}
		
		let explicitValence = Vec.numberArray(0, numAtoms);

		for (let n = 1; n <= numAtoms; n++)
		{
			let bits = atomBits[n - 1];
			if (bits == null) throw ERRPFX + 'atom definition missing for #' + n;
			
			let type = bits[1];
			let x = parseFloat(bits[2]), y = parseFloat(bits[3]), z = parseFloat(bits[4]);
			let map = parseInt(bits[5]);
			this.mol.addAtom(type, x, y);
			/* todo: handle Z in molecule
			if (z != 0) {mol.setAtomZ(n, z); mol.setIs3D(true);}*/
			this.mol.setAtomMapNum(n, map);
			
			for (let i = 6; i < bits.length; i++)
			{
				let eq = bits[i].indexOf('=');
				if (eq < 0) continue;
				let key = bits[i].substring(0, eq), val = bits[i].substring(eq + 1);
				if (key == 'CHG') this.mol.setAtomCharge(n, parseInt(val));
				else if (key == 'RAD') this.mol.setAtomUnpaired(n, parseInt(val));
				else if (key == 'MASS') this.mol.setAtomIsotope(n, parseInt(val));
				else if (key == 'CFG')
				{
					let stereo = parseInt(val);
					if (stereo > 0 && this.keepParity)
					{
						/* todo: record incoming parity
						let trans = this.mol.atomTransient(n);
						if (stereo == 1) mol.setAtomTransient(n, Vec.append(trans, ForeignMolecule.ATOM_CHIRAL_MDL_ODD));
						else if (stereo == 2) mol.setAtomTransient(n, Vec.append(trans, ForeignMolecule.ATOM_CHIRAL_MDL_EVEN));
						else if (stereo == 3) mol.setAtomTransient(n, Vec.append(trans, ForeignMolecule.ATOM_CHIRAL_MDL_RACEMIC));*/
					}
				}
				else if (key == 'VAL') explicitValence[n - 1] = parseInt(val);
			}
		}

		for (let n = 1; n <= numBonds; n++)
		{
			let bits = bondBits[n - 1];
			if (bits == null) throw ERRPFX + 'bond definition missing for #' + n;

			let type = parseInt(bits[1]), bfr = parseInt(bits[2]), bto = parseInt(bits[3]);
			let order = type >= 1 && type <= 3 ? type : 1;
			this.mol.addBond(bfr, bto, order);
		
			// type "4" is special: it is defined to be a special query type to match aromatic bonds, but it is sometimes used
			// to store actual molecules; in this case, it is necessary to either "deresonate" the rings, or to stash the property
			if (type == 4)
			{
				/* todo: handle resonance type (even though it's invalid)
				if (keepAromatic) mol.setBondTransient(n, Vec.append(mol.bondTransient(n), ForeignMolecule.BOND_AROMATIC));
				else
				{
					if (resBonds == null) resBonds = Vec.booleanArray(false, numBonds);
					resBonds[n] = true;
				}*/
			}

			for (let i = 4; i < bits.length; i++)
			{
				let eq = bits[i].indexOf('=');
				if (eq < 0) continue;
				let key = bits[i].substring(0, eq), val = bits[i].substring(eq + 1);
				if (key == 'CFG') 
				{
					let dir = parseInt(val);
					this.mol.setBondType(n, dir == 1 ? Molecule.BONDTYPE_INCLINED : 
											dir == 2 ? Molecule.BONDTYPE_UNKNOWN : 
											dir == 3 ? Molecule.BONDTYPE_DECLINED : Molecule.BONDTYPE_NORMAL);
				}
			}
		}
		
		this.postFix(explicitValence);
	}
	
	// takes a line of whitespace-separated stuff and breaks it into pieces
	private splitWithQuotes(line:string):string[]
	{
		// !! do it properly; and remember that "" -> quote literal
		return line.split('\\s+');
	}
}

export class MDLSDFReader
{
	public ds = new DataSheet();
	public upcastColumns = true; // if on, tries to decide on column types based on their data values; otherwise leaves as strings

	private pos = 0;
	private lines:string[];

	// ----------------- public methods -----------------

	constructor(strData:string)
	{
		this.lines = strData.split(/\r?\n/);
	}

	// perform the parsing operation, and populate the result fields
	public parse():DataSheet
	{
		this.parseStream();
		if (this.upcastColumns) this.upcastStringColumns();
		return this.ds;
	}
	
	// ----------------- private methods -----------------

	private parseStream():void
	{
		let ds = this.ds;
		ds.appendColumn('Molecule', DataSheet.COLTYPE_MOLECULE, 'Molecular structure');
		let colName = -1;
		let entry:string[] = [];

		// read the lines from the SD file, and every time a field is encountered, add it as type "string"
		while (this.pos < this.lines.length)
		{
			let line = this.lines[this.pos++];
			if (!line.startsWith('$$$$')) {entry.push(line); continue;}
			
			let rn = ds.appendRow();

			let molstr = '';
			let pos = 0;
			while (pos < entry.length)
			{
				line = entry[pos];
				if (line.startsWith('> ')) break;
				molstr += line + '\n';
				pos++;
				if (line.startsWith('M	END')) break;
			}

			let mol:Molecule = null, name:string = null;
			try 
			{
				if (molstr.length > 0)
				{
					let mdl = new MDLMOLReader(molstr);
					mdl.parse();
					mol = mdl.mol;
					name = mdl.molName;
				}
			}
			catch (ex) 
			{
				/*let msg = "Failed to parse CTAB, row#" + (rn + 1) + ":\n" + molstr;
				if (fatalMolFailures) throw new IOException(msg,ex);
				else if (reportMolFailures) Util.errmsg(msg, ex);*/
				// (leave the molecule null
			}
			if (mol != null) ds.setMolecule(rn, 0, mol);
			if (name)
			{
				if (colName < 0) colName = ds.appendColumn('Name', DataSheet.COLTYPE_STRING, 'Molecule name');
				ds.setString(rn, colName, name);
			}
			
			if (rn == 0 && mol != null)
			{
				let str1 = entry[0], str3 = entry[2];
				if (str1.length >= 7 && str1.startsWith('$name='))
				{
					ds.changeColumnName(0, str1.substring(6), ds.colDescr(0));
				}
				if (str3.length >= 8 && str3.startsWith('$title='))
				{
					ds.setTitle(str3.substring(7));
				}
			}
			
			for (; pos + 1 < entry.length; pos += 3)
			{
				let key = entry[pos], val = entry[pos + 1];
				if (!key.startsWith('>')) continue;
				let z = key.indexOf('<');
				if (z < 0) continue;
				key = key.substring(z + 1);
				z = key.indexOf('>');
				if (z < 0) continue;
				key = key.substring(0, z);
				if (key.length == 0) continue;
				
				while (pos + 2 < entry.length && entry[pos + 2].length > 0)
				{
					val += '\n' + entry[pos + 2];
					pos++;
				}
				
				let cn = ds.findColByName(key);
				if (cn < 0) cn = ds.appendColumn(key, DataSheet.COLTYPE_STRING, '');
				
				if (val.length == 0) ds.setToNull(rn, cn);
				else ds.setString(rn, cn, val);
			}
		 
			entry = [];
		}

		if (ds.numRows == 0) this.ds = null;
	}

	private upcastStringColumns():void
	{
		let ds = this.ds;
		for (let i = 0; i < ds.numCols; i++) if (ds.colType(i) == DataSheet.COLTYPE_STRING)
		{
			let allnull = true, allreal = true, allint = true, allbool = true;
			for (let j = 0; j < ds.numRows; j++)
			{
				if (!allreal && !allint && !allbool) break;
				if (ds.isNull(j, i)) continue;
				
				allnull = false;

				let val = ds.getString(j, i);
				if (allbool)
				{
					let lc = val.toLowerCase();
					if (lc != 'true' && lc != 'false') allbool = false;
				}
				if (allint)
				{
					let int = parseInt(val);
					if (!isFinite(int) || int != parseFloat(val)) allint = false;
				}
				if (allreal)
				{
					if (!isFinite(parseFloat(val))) allreal = false;
				}
			}

			if (allnull) {} // do nothing
			else if (allint) ds.changeColumnType(i, DataSheet.COLTYPE_INTEGER);
			else if (allreal) ds.changeColumnType(i, DataSheet.COLTYPE_REAL);
			else if (allbool) ds.changeColumnType(i, DataSheet.COLTYPE_BOOLEAN);
		}
	}	
}

/* EOF */ }