/*
    WebMolKit

    (c) 2010-2016 Molecular Materials Informatics, Inc.

    All rights reserved
    
    http://molmatinf.com

	[PKG=webmolkit]
*/

///<reference path='../data/Molecule.ts'/>
///<reference path='../gfx/Rendering.ts'/>
///<reference path='../gfx/FontData.ts'/>
///<reference path='../util/Geom.ts'/>
///<reference path='ArrangeMeasurement.ts'/>
///<reference path='ArrangeMolecule.ts'/>
///<reference path='MetaVector.ts'/>
///<reference path='Rendering.ts'/>

/*
	Controlling class for drawing a molecule in a vector graphics format: this turns an "arranged molecule" instance into the series of primitives that
	can be mapped directly to a rendering engine or output format, as encapsulated by the VectorGfxBuilder subclasses.
	
	Note that in this implementation of rendering, only the molecule is drawn, without interactive effects. The constructor/draw/build sequence should be
	called only once during the lifetime of this object.
*/

class DrawMolecule
{
	private mol:Molecule;
	private policy:RenderPolicy;
	private effects:RenderEffects;

	private scale:number;
	private invScale:number;
	
	constructor(private layout:ArrangeMolecule, private vg:MetaVector)
	{
		this.mol = layout.getMolecule();
		this.policy = layout.getPolicy();
		this.effects = layout.getEffects();
		this.scale = layout.getScale();
		this.invScale = 1.0 / this.scale;
	}
	
	// access to content
	public getMolecule():Molecule {return this.mol;}
	public getMetaVector():MetaVector {return this.vg;}
	public getLayout():ArrangeMolecule {return this.layout;}
	public getPolicy():RenderPolicy {return this.policy;}
	public getEffects():RenderEffects {return this.effects;}
	
	// renders the molecular structure
	public draw():void
	{
		// debugging: draw the "space filling" areas-to-avoid
		let DRAW_SPACE = false;
		if (DRAW_SPACE) for (let n = 0; n < this.layout.numSpace(); n++)
		{
			let spc = this.layout.getSpace(n);
			//this.vg.drawRect(spc.box.x, spc.box.y, spc.box.w, spc.box.h, MetaVector.NOCOLOUR, 0, 0xE0E0E0);
			if (spc.px != null && spc.py != null && spc.px.length > 2) this.vg.drawPoly(spc.px, spc.py, MetaVector.NOCOLOUR, 0, 0x8080FF, true);
		}

		// emit the drawing elements as vector primitives
		
		for (let n = 0; n < this.layout.numLines(); n++)
		{
			let b = this.layout.getLine(n);

			if (b.type == BLineType.Normal)
			{
				this.vg.drawLine(b.line.x1, b.line.y1, b.line.x2, b.line.y2, b.col, b.size);
			}
			else if (b.type == BLineType.Inclined) this.drawBondInclined(b);
			else if (b.type == BLineType.Declined) this.drawBondDeclined(b);
			else if (b.type == BLineType.Unknown) this.drawBondUnknown(b);
			else if (b.type == BLineType.Dotted || b.type == BLineType.DotDir) this.drawBondDotted(b);
			else if (b.type == BLineType.IncDouble || b.type == BLineType.IncTriple || b.type == BLineType.IncQuadruple) this.drawBondIncMulti(b);
		}
		
		for (let n = 0; n < this.layout.numPoints(); n++)
		{
			let p = this.layout.getPoint(n);

			let txt = p.text;
			if (txt == null) continue; // is a point, so do not draw anything
			let fsz = p.fsz;
			let cx = p.oval.cx, cy = p.oval.cy, rw = p.oval.rw;
			let col = p.col;

			while (txt.endsWith("."))
			{
				let dw = rw / txt.length;
				let r = fsz * 0.15;
				this.vg.drawOval(cx + rw - dw, cy, r, r, MetaVector.NOCOLOUR, 0, col);

				cx -= dw;
				rw -= dw;
				txt = txt.substring(0, txt.length - 1);
			}
			while (txt.startsWith("+"))
			{
				let dw = rw / txt.length;
				let x = cx - rw + dw, y = cy, r = fsz * 0.18, lsz = fsz * 0.1;
				this.vg.drawLine(x - r, y, x + r, y, col, lsz);
				this.vg.drawLine(x, y - r, x, y + r, col, lsz);

				cx += dw;
				rw -= dw;
				txt = txt.substring(1, txt.length);
			}
			while (txt.startsWith("-"))
			{
				let dw = rw / txt.length;
				let x = cx - rw + dw, y = cy, r = fsz * 0.18, lsz = fsz * 0.1;
				this.vg.drawLine(x - r, y, x + r, y, col, lsz);

				cx += dw;
				rw -= dw;
				txt = txt.substring(1, txt.length);
			}
			if (txt.length > 0)
			{
				this.vg.drawText(cx, cy, txt, fsz, col, TextAlign.Centre | TextAlign.Middle);
			}
		}
	}
	
	private drawBondInclined(b:BLine):void
	{
		let x1 = b.line.x1, y1 = b.line.y1, x2 = b.line.x2, y2 = b.line.y2;
		let dx = x2 - x1, dy = y2 - y1;
		let col = b.col;
		let size = b.size, head = b.head;

		let norm = head / Math.sqrt(dx * dx + dy * dy);
		let ox = norm * dy, oy = -norm * dx;
		let px = [x1, x2 - ox, x2 + ox], py = [y1, y2 - oy, y2 + oy];

		// if endpoint is divalent, consider modifying the polygon shape
		if (this.layout.getPoint(b.bto - 1).text == null && this.mol.atomAdjCount(b.bto) == 2)
		{
			let other:BLine = null;
			for (let n = 0; n < this.layout.numLines(); n++)
			{
				let o = this.layout.getLine(n);
				if (o.type == BLineType.Normal && (o.bfr == b.bto || o.bto == b.bto))
				{
					if (other != null) {other = null; break;} // must be only one
					other = o;
				}
			}
			if (other != null)
			{
				let th1 = Math.atan2(y1 - y2, x1 - x2);
				let th2 = Math.atan2(other.line.y1 - other.line.y2, other.line.x1 - other.line.x2);
				if (b.bto == other.bfr) th2 += Math.PI;
				let diff = Math.abs(angleDiff(th1, th2));
				if (diff > 105 * DEGRAD && diff < 135 * DEGRAD)
				{
					let ixy1 = GeomUtil.lineIntersect(px[0], py[0], px[1], py[1], other.line.x1, other.line.y1, other.line.x2, other.line.y2);
					let ixy2 = GeomUtil.lineIntersect(px[0], py[0], px[2], py[2], other.line.x1, other.line.y1, other.line.x2, other.line.y2);
					px[1] = ixy1[0];
					py[1] = ixy1[1];
					px[2] = ixy2[0];
					py[2] = ixy2[1];

					// extend slightly, to overlap the line
					let dx1 = px[1] - px[0], dy1 = py[1] - py[0], inv1 = 0.5 * other.size / norm_xy(dx1, dy1);
					px[1] += dx1 * inv1;
					py[1] += dy1 * inv1;
					let dx2 = px[2] - px[0], dy2 = py[2] - py[0], inv2 = 0.5 * other.size / norm_xy(dx2, dy2);
					px[2] += dx2 * inv1;
					py[2] += dy2 * inv1;
				}
			}
		}

		// if endpoint is trivalent, another modification is considered
		if (this.layout.getPoint(b.bto - 1).text == null && this.mol.atomAdjCount(b.bto) == 3)
		{
			let other1:BLine = null, other2:BLine = null;
			for (let n = 0; n < this.layout.numLines(); n++)
			{
				let o = this.layout.getLine(n);
				if (o.type == BLineType.Normal && (o.bfr == b.bto || o.bto == b.bto))
				{
					if (other1 == null) other1 = o;
					else if (other2 == null) other2 = o;
					else
					{
						other1 = other2 = null;
						break;
					}
				}
			}
			if (other1 != null && other2 != null)
			{
				let th1 = Math.atan2(y1 - y2, x1 - x2);
				let th2 = Math.atan2(other1.line.y1 - other1.line.y2, other1.line.x1 - other1.line.x2);
				let th3 = Math.atan2(other2.line.y1 - other2.line.y2, other2.line.x1 - other2.line.x2);
				if (b.bto == other1.bfr) th2 += Math.PI;
				if (b.bto == other2.bfr) th3 += Math.PI;
				let dth1 = angleDiff(th1, th2), diff1 = Math.abs(dth1);
				let dth2 = angleDiff(th1, th3), diff2 = Math.abs(dth2);
				let diff3 = Math.abs(angleDiff(th2, th3));
				if (diff1 > 105 * DEGRAD && diff1 < 135 * DEGRAD || 
					diff2 > 105 * DEGRAD && diff2 < 135 * DEGRAD ||
					diff3 > 105 * DEGRAD && diff3 < 135 * DEGRAD)
				{
					if (dth1 < 0) [other1, other2] = [other2, other1];
					let ixy1 = GeomUtil.lineIntersect(px[0], py[0], px[1], py[1], other1.line.x1, other1.line.y1, other1.line.x2, other1.line.y2);
					let ixy2 = GeomUtil.lineIntersect(px[0], py[0], px[2], py[2], other2.line.x1, other2.line.y1, other2.line.x2, other2.line.y2);
					px = [x1, ixy1[0], x2, ixy2[0]];
					py = [y1, ixy1[1], y2, ixy2[1]];
				}
			}
		}
		
		this.vg.drawPoly(px, py, MetaVector.NOCOLOUR, 0, col, true);
	}
	private drawBondDeclined(b:BLine):void
	{
		let x1 = b.line.x1, y1 = b.line.y1, x2 = b.line.x2, y2 = b.line.y2;
		let dx = x2 - x1, dy = y2 - y1;
		let col = b.col;
		let size = b.size, head = b.head;

		let ext = Math.sqrt(dx * dx + dy * dy);
		let nsteps = Math.ceil(ext * 2.5 * this.invScale);
		let norm = head / ext;
		let ox = norm * dy, oy = -norm * dx, invSteps = 1.0 / (nsteps + 1);
		let holdout = this.mol.atomAdjCount(b.bto) == 1 && this.layout.getPoint(b.bto - 1).text == null ? 1 : 1 - (0.15 * this.scale) / ext;
		for (let i = 0; i <= nsteps + 1; i++)
		{
			let cx = x1 + i * dx * invSteps * holdout, cy = y1 + i * dy * invSteps * holdout;
			let ix = ox * i * invSteps, iy = oy * i * invSteps;
			this.vg.drawLine(cx - ix, cy - iy, cx + ix, cy + iy, col, size);
		}
	}
	private drawBondUnknown(b:BLine):void
	{
		let x1 = b.line.x1, y1 = b.line.y1, x2 = b.line.x2, y2 = b.line.y2;
		let dx = x2 - x1, dy = y2 - y1;
		let col = b.col;
		let size = b.size, head = b.head;

		let ext = Math.sqrt(dx * dx + dy * dy);
		let nsteps = Math.ceil(ext * 3.5 * this.invScale);
		let norm = head / ext;
		let ox = norm * dy, oy = -norm * dx;
		let sz = 1 + 3 * (nsteps + 1);
		let x = Vec.numberArray(0, sz), y = Vec.numberArray(0, sz), ctrl = Vec.booleanArray(false, sz);
		x[0] = x1;
		y[0] = y1;
		ctrl[0] = false;

		for (let i = 0, j = 1; i <= nsteps; i++, j += 3)
		{
			let ax = x1 + i * dx / (nsteps + 1), ay = y1 + i * dy / (nsteps + 1);
			let cx = x1 + (i + 1) * dx / (nsteps + 1), cy = y1 + (i + 1) * dy / (nsteps + 1);
			let bx = (ax + cx) / 2, by = (ay + cy) / 2;
			let sign = i % 2 == 0 ? 1 : -1;

			x[j] = ax;
			x[j + 1] = bx + sign * ox;
			x[j + 2] = cx;
			y[j] = ay;
			y[j + 1] = by + sign * oy;
			y[j + 2] = cy;
			ctrl[j] = true;
			ctrl[j + 1] = true;
			ctrl[j + 2] = false;
		}
		this.vg.drawPath(x, y, ctrl, true, col, size, MetaVector.NOCOLOUR, false);
	}
	private drawBondDotted(b:BLine):void
	{
		let x1 = b.line.x1, y1 = b.line.y1, x2 = b.line.x2, y2 = b.line.y2;
		let dx = x2 - x1, dy = y2 - y1;
		let col = b.col;
		let size = b.size;

		let radius = size, dist = norm_xy(dx, dy);
		if (dist < 0.01) return;
		let nudge = 0.5 * size / dist;
		x1 += nudge * dx;
		y1 += nudge * dy;
		x2 -= nudge * dx;
		y2 -= nudge * dy;
		dx = x2 - x1;
		dy = y2 - y1;
		
		let nsteps = Math.ceil(0.2 * dist / radius);
		let invSteps = 1.0 / (nsteps + 1);
		for (let i = 0; i <= nsteps + 1; i++)
		{
			let r = radius;
			if (b.type == BLineType.DotDir) r *= 1 + (i * (1.0 / (nsteps + 2)) - 0.5);
			let cx = x1 + i * dx * invSteps, cy = y1 + i * dy * invSteps;
			this.vg.drawOval(cx, cy, r, r, MetaVector.NOCOLOUR, 0, col);
		}
	}
	private drawBondIncMulti(b:BLine):void
	{
		let x1 = b.line.x1, y1 = b.line.y1, x2 = b.line.x2, y2 = b.line.y2;
		let dx = x2 - x1, dy = y2 - y1;
		let col = b.col;
		let size = b.size, head = b.head;

		let norm = head / Math.sqrt(dx * dx + dy * dy);
		let ox = norm * dy, oy = -norm * dx;
		this.vg.drawPoly([x1, x2 - ox, x2 + ox], [y1, y2 - oy, y2 + oy], col, this.scale * 0.05, MetaVector.NOCOLOUR, true);
		
		if (b.type == BLineType.IncDouble)
		{
			this.vg.drawLine(x1, y1, x2, y2, col, this.scale * 0.03);
		}
		else
		{
			this.vg.drawLine(x1, y1, x2 + 0.33 * ox, y2 + 0.33 * oy, col, this.scale * 0.03);
			this.vg.drawLine(x1, y1, x2 - 0.33 * ox, y2 - 0.33 * oy, col, this.scale * 0.03);
		}
	}
}
