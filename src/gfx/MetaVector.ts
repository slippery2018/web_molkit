/*
    MolSync

    (c) 2010-2016 Molecular Materials Informatics, Inc.

    All rights reserved
    
    http://molmatinf.com

	[PKG=molsync]
*/

/*
	MetaVector: parses a vector datastructure, typically generated by the server, and allows it to be rendered or modified

	Properties:
		.width,.height: unscaled dimensions
		.prims: array of primitives, each of which is a single thing-to-draw
		.types: array of definitions for reuse by the primitives
		.offsetX,.offsetY,.scale: transform parameters, default to (0,0,1)
				x'=offsetX+x*scale
				y'=offsetY+y*scale

	Each primitive is an array; first entry is type, the rest varies:

		[PRIM_LINE,typeidx,x1,y1,x2,y2]
		[PRIM_RECT,typeidx,x,y,w,h]
		[PRIM_OVAL,typeidx,x,y,w,h]
		[PRIM_PATH,typeidx,numPoints,xpoints[],ypoints[],ctrlFlags[],isClosed]
		[PRIM_TEXT,typeidx,x,y,txt]

	Each type is an array; first entry is type-of-type, the rest varies:

		[PRIM_LINE,thickness,colour]
		[PRIM_RECT,edgeCol,fillCol,thickness]
		[PRIM_OVAL,edgeCol,fillCol,thickness]
		[PRIM_PATH,edgeCol,fillCol,thickness,hardEdge]
		[PRIM_TEXT,size,colour]
*/

class MetaVector
{
	private PRIM_LINE = 1;
	private PRIM_RECT = 2;
	private PRIM_OVAL = 3;
	private PRIM_PATH = 4;
	private PRIM_TEXT = 5;

	private ONE_THIRD = 1.0 / 3;
	
	types:any[];
	prims:any[];
	typeObj:any[];
	public width:number;
	public height:number;
	public offsetX = 0;
	public offsetY = 0;
	public scale = 1;
	public density = 1;
	
	// ------------ public methods ------------

	constructor(vec:any)
	{
		this.types = vec.types;
		this.prims = vec.prims;
		this.width = vec.size[0];
		this.height = vec.size[1];
		
		if (this.types == null) this.types = [];
		if (this.prims == null) this.prims = [];
	}

	// methods for adding a primitive (and possibly a type to go with it)
	public drawLine(x1:number, y1:number, x2:number, y2:number, thickness:number, colour:number)
	{
		if (!thickness) thickness = 1;
		let typeidx = this.findOrCreateType([this.PRIM_LINE, thickness, colour]);
		this.prims.push([this.PRIM_LINE, typeidx, x1, y1, x2, y2]);
	}
	public drawRect(x:number, y:number, w:number, h:number, edgeCol:number, fillCol:number, thickness:number)
	{
		if (!edgeCol) edgeCol = -1;
		if (!fillCol) fillCol = -1;
		if (!thickness) thickness = 1;
		let typeidx = this.findOrCreateType([this.PRIM_RECT, edgeCol, fillCol, thickness]);
		this.prims.push([this.PRIM_RECT, typeidx, x, y, w, h]);
	}
	public drawOval(x:number, y:number, w:number, h:number, edgeCol:number, fillCol:number, thickness:number)
	{
		if (!edgeCol) edgeCol = -1;
		if (!fillCol) fillCol = -1;
		if (!thickness) thickness = 1;
		let typeidx = this.findOrCreateType([this.PRIM_OVAL, edgeCol, fillCol, thickness]);
		this.prims.push([this.PRIM_OVAL, typeidx, x, y, w, h]);
	}
	public drawPath(xpoints:number[], ypoints:number[], ctrlFlags:boolean[], isClosed:boolean, edgeCol:number, fillCol:number, thickness:number, hardEdge:boolean)
	{
		if (edgeCol) edgeCol = -1;
		if (fillCol) fillCol = -1;
		if (thickness) thickness = 1;
		if (hardEdge) hardEdge = false;
		let typeidx = this.findOrCreateType([this.PRIM_PATH, edgeCol, fillCol, thickness, hardEdge]);
		this.prims.push([this.PRIM_PATH, typeidx, xpoints.length, xpoints, ypoints, ctrlFlags, isClosed]);
	}
	public drawText(x:number, y:number, txt:string, size:number, colour:number)
	{
		let typeidx = this.findOrCreateType([this.PRIM_TEXT, size, colour]);
		this.prims.push([this.PRIM_TEXT, typeidx, x, y, txt]);
	}

	// for text of a given size, returns [width,ascent,descent]; all of these numbers are positive; text drawing always uses
	// the left/baseline as the reference position
	public measureText(txt:string, size:number)
	{
		let fd = FontData.main;
		
		let scale = size / fd.UNITS_PER_EM;
		let dx = 0;
		for (let n = 0; n < txt.length; n++)
		{
			let i = txt.charCodeAt(n) - 32;
			if (i < 0 || i >= 96)
			{
				dx += fd.MISSING_HORZ;
				continue;
			}
			
			dx += fd.HORIZ_ADV_X[i];
			if (n < txt.length - 1)
			{
				let j = txt.charCodeAt(n + 1) - 32;
				for (let k = 0; k < fd.KERN_K.length; k++)
					if ((fd.KERN_G1[k] == i && fd.KERN_G2[k] == j) || (fd.KERN_G1[k] == j && fd.KERN_G2[k] == i))
						{dx += fd.KERN_K[k]; break;}
			}
		}

		return [dx * scale, fd.ASCENT * scale * fd.ASCENT_FUDGE, -fd.DESCENT * scale];
	}

	// renders the meta vector by creating a new canvas
	public renderInto(parent:any)
	{
		let canvas = <HTMLCanvasElement>newElement(parent, 'canvas', {'width': this.width, 'height': this.height});
		this.renderCanvas(canvas);
		return canvas;
	}

	// renders the meta vector into an existing canvas
	public renderCanvas(canvas:HTMLCanvasElement, clearFirst?:boolean)
	{
		let ctx = canvas.getContext('2d');
		if (clearFirst) ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		let w = canvas.style.width ? parseInt(canvas.style.width) : canvas.width / this.density;
		let h = canvas.style.height ? parseInt(canvas.style.height) : canvas.height / this.density;
		
		this.density = pixelDensity();
		
		canvas.style.width = w + 'px';
		canvas.style.height = h + 'px';
		canvas.width = w * this.density;
		canvas.height = h * this.density;

		this.renderContext(ctx);
	}

	// renders the meta vector into a context (this is useful when there's stuff to draw above or below)
	public renderContext(ctx:CanvasRenderingContext2D)
	{
		ctx.save();
		ctx.scale(this.density, this.density);
		
		this.typeObj = [];
		for (let n = 0; n < this.types.length; n++)
		{
			let t = this.types[n];
			if (t[0] == this.PRIM_LINE) this.typeObj[n] = this.setupTypeLine(t);
			else if (t[0] == this.PRIM_RECT) this.typeObj[n] = this.setupTypeRect(t);
			else if (t[0] == this.PRIM_OVAL) this.typeObj[n] = this.setupTypeOval(t);
			else if (t[0] == this.PRIM_PATH) this.typeObj[n] = this.setupTypePath(t);
			else if (t[0] == this.PRIM_TEXT) this.typeObj[n] = this.setupTypeText(t);
		}
		for (let n = 0; n < this.prims.length; n++)
		{
			let p = this.prims[n];
			if (p[0] == this.PRIM_LINE) this.renderLine(ctx, p);
			else if (p[0] == this.PRIM_RECT) this.renderRect(ctx, p);
			else if (p[0] == this.PRIM_OVAL) this.renderOval(ctx, p);
			else if (p[0] == this.PRIM_PATH) this.renderPath(ctx, p);
			else if (p[0] == this.PRIM_TEXT) this.renderText(ctx, p);
		}
		
		ctx.restore();
	}

	// ------------ private methods ------------

	// transform stored types into renderables
	public setupTypeLine(t:any[])
	{
		let thickness = t[1] * this.scale;
		let colour = t[2];
		return {'thickness': thickness, 'colour': colourCanvas(colour)};
	}
	public setupTypeRect(t:any[])
	{
		let edgeCol = t[1];
		let fillCol = t[2];
		let thickness = t[3] * this.scale;
		return {'edgeCol': colourCanvas(edgeCol), 'fillCol': colourCanvas(fillCol), 'thickness': thickness};
	}
	public setupTypeOval(t:any[])
	{
		let edgeCol = t[1];
		let fillCol = t[2];
		let thickness = t[3] * this.scale;
		return {'edgeCol': colourCanvas(edgeCol), 'fillCol': colourCanvas(fillCol), 'thickness': thickness};
	}
	public setupTypePath(t:any[])
	{
		let edgeCol = t[1];
		let fillCol = t[2];
		let thickness = t[3] * this.scale;
		let hardEdge = t[4];
		return {'edgeCol': colourCanvas(edgeCol), 'fillCol': colourCanvas(fillCol), 'thickness': thickness, 'hardEdge': hardEdge};
	}
	public setupTypeText(t:any[])
	{
		let sz = t[1] * this.scale;
		let colour = t[2];
		return {'colour': colourCanvas(colour), 'size': sz};
	}

	// perform actual rendering for the primitives
	public renderLine(ctx:CanvasRenderingContext2D, p:any)
	{
		let type = this.typeObj[p[1]];
		let x1 = p[2], y1 = p[3];
		let x2 = p[4], y2 = p[5];
		
		x1 = this.offsetX + this.scale * x1;
		y1 = this.offsetY + this.scale * y1;
		x2 = this.offsetX + this.scale * x2;
		y2 = this.offsetY + this.scale * y2;

		if (type.colour)
		{
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.strokeStyle = type.colour;
			ctx.lineWidth = type.thickness;
			ctx.lineCap = 'round';
			ctx.stroke();
		}
	}
	public renderRect(ctx:CanvasRenderingContext2D, p:any)
	{
		let type = this.typeObj[p[1]];
		let x = p[2], y = p[3];
		let w = p[4], h = p[5];

		x = this.offsetX + this.scale * x;
		y = this.offsetY + this.scale * y;
		w *= this.scale;
		h *= this.scale;

		if (type.fillCol)
		{
			ctx.fillStyle = type.fillCol;
			ctx.fillRect(x, y, w, h);
		}
		if (type.edgeCol)
		{
			ctx.strokeStyle = type.edgeCol;
			ctx.lineWidth = type.thickness;
			ctx.lineCap = 'square';
			ctx.strokeRect(x, y, w, h);
		}
	}
	public renderOval(ctx:CanvasRenderingContext2D, p:any)
	{
		let type = this.typeObj[p[1]];
		let cx = p[2], cy = p[3];
		let rw = p[4], rh = p[5];

		cx = this.offsetX + this.scale * cx;
		cy = this.offsetY + this.scale * cy;
		rw *= this.scale;
		rh *= this.scale;
		
		if (type.fillCol)
		{
			ctx.fillStyle = type.fillCol;
			ctx.beginPath();
			ctx.ellipse(cx, cy, rw, rh, 0, 0, 2 * Math.PI, true);
			ctx.fill();
		}
		if (type.edgeCol)
		{
			ctx.strokeStyle = type.edgeCol;
			ctx.lineWidth = type.thickness;
			ctx.beginPath();
			ctx.ellipse(cx, cy, rw, rh, 0, 0, 2 * Math.PI, true);
			ctx.stroke();
		}
	}
	public renderPath(ctx:CanvasRenderingContext2D, p:any)
	{
		let type = this.typeObj[p[1]];
		let npts = p[2];
		if (npts == 0) return;
		let x = p[3], y = p[4];
		let ctrl = p[5];
		let isClosed = p[6];
		
		for (let n = 0; n < npts; n++)
		{
			x[n] = this.offsetX + this.scale * x[n];
			y[n] = this.offsetY + this.scale * y[n];
		}

		for (let layer = 1; layer <= 2; layer++)
		{
			if (layer == 1 && !type.fillCol) continue;
			if (layer == 2 && !type.edgeCol) continue;
				
			ctx.beginPath();
			ctx.moveTo(x[0], y[0]);
			for (let i = 1; i < npts; i++)
			{
				if (!ctrl[i])
				{
					ctx.lineTo(x[i], y[i]);
				}
				else if (i < npts - 1 && !ctrl[i + 1])
				{
					ctx.quadraticCurveTo(x[i], y[i], x[i + 1], y[i + 1]);
					i++;
				}
				else if (i < npts - 1 && !ctrl[i + 2])
				{
					ctx.bezierCurveTo(x[i], y[i], x[i + 1], y[i + 1], x[i + 2], y[i + 2]);
					i += 2;
				}
			}
			if (isClosed) ctx.closePath();
		
			if (layer == 1)
			{
				ctx.fillStyle = type.fillCol;
				ctx.fill();
			}
			else
			{
				ctx.strokeStyle = type.edgeCol;
				ctx.lineWidth = type.thickness;
				ctx.lineCap = type.hardEdge ? 'square' : 'round';
				ctx.lineJoin = type.hardEdge ? 'miter' : 'round';
				ctx.stroke();
			}
		}
	}
	private renderText(ctx:CanvasRenderingContext2D, p:any)
	{
		let type = this.typeObj[p[1]];
		let x = p[2], y = p[3];
		let txt = p[4];
		
		let sz = type.size;
		let fill = type.colour;

		x = this.offsetX + this.scale * x;
		y = this.offsetY + this.scale * y;
		//sz *= this.scale; (already done);

		let fd = FontData.main;
		
		let scale = sz / fd.UNITS_PER_EM;
		let dx = 0;
		for (let n = 0; n < txt.length; n++)
		{
			let i = txt.charCodeAt(n) - 32;
			if (i < 0 || i >= 96)
			{
				dx += fd.MISSING_HORZ;
				continue;
			}

			let path = fd.getGlyphPath(i);
			if (path)
			{
				ctx.save();
				ctx.translate(x + dx * scale, y);
				ctx.scale(scale, -scale);
				ctx.fillStyle = fill;
				ctx.fill(path);
				ctx.restore();
			}
			
			dx += fd.HORIZ_ADV_X[i];
			if (n < txt.length - 1)
			{
				let j = txt.charCodeAt(n + 1) - 32;
				for (let k = 0; k < fd.KERN_K.length; k++)
					if ((fd.KERN_G1[k] == i && fd.KERN_G2[k] == j) || (fd.KERN_G1[k] == j && fd.KERN_G2[k] == i))
						{dx += fd.KERN_K[k]; break;}
			}
		}
	}

	// for a type definition array, see if it exists in the list, and return that index - or if not, push it on
	private findOrCreateType(typeDef:any)
	{
		for (let i = 0; i < this.types.length; i++)
		{	
			if (this.types[i].length != typeDef.length) continue;
			let match = true;
			for (let j = 0; j < typeDef.length; j++) if (typeDef[j] != this.types[i][j])
			{
				match = false;
				break;
			}
			if (match) return i;
		}
		this.types.push(typeDef);
		return this.types.length - 1;
	}
}