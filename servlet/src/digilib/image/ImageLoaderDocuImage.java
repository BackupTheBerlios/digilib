/* ImageLoaderDocuImage -- Image class implementation using JDK 1.4 ImageLoader

  Digital Image Library servlet components

  Copyright (C) 2002, 2003 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

*/

package digilib.image;

import java.awt.Rectangle;
import java.awt.geom.AffineTransform;
import java.awt.geom.Rectangle2D;
import java.awt.image.AffineTransformOp;
import java.awt.image.BufferedImage;
import java.awt.image.ConvolveOp;
import java.awt.image.Kernel;
import java.awt.image.RescaleOp;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.util.Iterator;

import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import digilib.io.FileOpException;

/** Implementation of DocuImage using the ImageLoader API of Java 1.4 and Java2D. */
public class ImageLoaderDocuImage extends DocuImageImpl {

	/** image object */
	protected BufferedImage img;
	/** interpolation type */
	protected int interpol;
	/** ImageIO image reader */
	protected ImageReader reader;
	/** File that was read */
	protected File imgFile;

	/* loadSubimage is supported. */
	public boolean isSubimageSupported() {
		return true;
	}

	public void setQuality(int qual) {
		quality = qual;
		// setup interpolation quality
		if (qual > 0) {
			util.dprintln(4, "quality q1");
			interpol = AffineTransformOp.TYPE_BILINEAR;
		} else {
			util.dprintln(4, "quality q0");
			interpol = AffineTransformOp.TYPE_NEAREST_NEIGHBOR;
		}
	}

	public int getHeight() {
		int h = 0;
		try {
			if (img == null) {
				h = reader.getHeight(0);
			} else {
				h = img.getHeight();
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
		return h;
	}

	public int getWidth() {
		int w = 0;
		try {
			if (img == null) {
				w = reader.getWidth(0);
			} else {
				w = img.getWidth();
			}
		} catch (IOException e) {
			e.printStackTrace();
		}
		return w;
	}

	/* load image file */
	public void loadImage(File f) throws FileOpException {
		util.dprintln(10, "loadImage!");
		System.gc();
		try {
			img = ImageIO.read(f);
			if (img == null) {
				util.dprintln(3, "ERROR(loadImage): unable to load file");
				throw new FileOpException("Unable to load File!");
			}
		} catch (IOException e) {
			throw new FileOpException("Error reading image.");
		}
	}

	/** Get an ImageReader for the image file.
	 * 
	 */
	public void preloadImage(File f) throws IOException {
		System.gc();
		RandomAccessFile rf = new RandomAccessFile(f, "r");
		ImageInputStream istream = ImageIO.createImageInputStream(rf);
		Iterator readers = ImageIO.getImageReaders(istream);
		reader = (ImageReader) readers.next();
		/* are there more readers?
		System.out.println("this reader: " + reader.getClass());
		while (readers.hasNext()) {
			System.out.println("next reader: " + readers.next().getClass());
		}
		*/
		reader.setInput(istream);
		if (reader == null) {
			util.dprintln(3, "ERROR(loadImage): unable to load file");
			throw new FileOpException("Unable to load File!");
		}
		imgFile = f;
	}

	/* Load an image file into the Object. */
	public void loadSubimage(File f, Rectangle region, int prescale)
		throws FileOpException {
		System.gc();
		try {
			if ((reader == null) || (imgFile != f)) {
				preloadImage(f);
			}
			// set up reader parameters
			ImageReadParam readParam = reader.getDefaultReadParam();
			readParam.setSourceRegion(region);
			readParam.setSourceSubsampling(prescale, prescale, 0, 0);
			// read image
			img = reader.read(0, readParam);
		} catch (IOException e) {
			util.dprintln(3, "ERROR(loadImage): unable to load file");
			throw new FileOpException("Unable to load File!");
		}
		if (img == null) {
			util.dprintln(3, "ERROR(loadImage): unable to load file");
			throw new FileOpException("Unable to load File!");
		}
	}

	/* write image of type mt to Stream */
	public void writeImage(String mt, OutputStream ostream)
		throws FileOpException {
		util.dprintln(10, "writeImage!");
		try {
			// setup output
			String type = "png";
			if (mt == "image/jpeg") {
				type = "jpeg";
			} else if (mt == "image/png") {
				type = "png";
			} else {
				// unknown mime type
				util.dprintln(2, "ERROR(writeImage): Unknown mime type " + mt);
				throw new FileOpException("Unknown mime type: " + mt);
			}

			/* JPEG doesn't do transparency so we have to convert any RGBA image
			 * to RGB :-( *Java2D BUG*
			 */
			if ((type == "jpeg") && (img.getColorModel().hasAlpha())) {
				util.dprintln(2, "BARF: JPEG with transparency!!");
				int w = img.getWidth();
				int h = img.getHeight();
				// BufferedImage.TYPE_INT_RGB seems to be fastest (JDK1.4.1, OSX)
				int destType = BufferedImage.TYPE_INT_RGB;
				BufferedImage img2 = new BufferedImage(w, h, destType);
				img2.createGraphics().drawImage(img, null, 0, 0);
				img = img2;
			}

			// render output
			if (ImageIO.write(img, type, ostream)) {
				// writing was OK
				return;
			} else {
				throw new FileOpException("Error writing image: Unknown image format!");
			}
		} catch (IOException e) {
			// e.printStackTrace();
			throw new FileOpException("Error writing image.");
		}
	}

	public void scale(double scale) throws ImageOpException {
		/*
		 * for downscaling in high quality the image is blurred first
		 */
		if ((scale <= 0.5) && (quality > 1)) {
			int bl = (int) Math.floor(1 / scale);
			blur(bl);
		}
		/*
		 * and scaled
		 */
		AffineTransformOp scaleOp =
			new AffineTransformOp(
				AffineTransform.getScaleInstance(scale, scale),
				interpol);
		BufferedImage scaledImg = null;
		// enforce grey destination image for greyscale *Java2D BUG*
		if ((quality > 0)
			&& (img.getColorModel().getNumColorComponents() == 1)) {
			Rectangle2D dstBounds = scaleOp.getBounds2D(img);
			scaledImg =
				new BufferedImage(
					(int) dstBounds.getWidth(),
					(int) dstBounds.getHeight(),
					img.getType());
		}
		scaledImg = scaleOp.filter(img, scaledImg);
		//DEBUG
		util.dprintln(
			3,
			"SCALE: "
				+ scale
				+ " ->"
				+ scaledImg.getWidth()
				+ "x"
				+ scaledImg.getHeight());
		if (scaledImg == null) {
			util.dprintln(2, "ERROR(cropAndScale): error in scale");
			throw new ImageOpException("Unable to scale");
		}
		img = scaledImg;
	}

	public void blur(int radius) throws ImageOpException {
		//DEBUG
		util.dprintln(4, "blur: " + radius);
		// minimum radius is 2
		int klen = Math.max(radius, 2);
		int ksize = klen * klen;
		// kernel is constant 1/k
		float f = 1f / ksize;
		float[] kern = new float[ksize];
		for (int i = 0; i < ksize; i++) {
			kern[i] = f;
		}
		Kernel blur = new Kernel(klen, klen, kern);
		// blur with convolve operation
		ConvolveOp blurOp = new ConvolveOp(blur, ConvolveOp.EDGE_NO_OP, null);
		// blur needs explicit destination image type for color *Java2D BUG*
		BufferedImage blurredImg = null;
		if (img.getType() == BufferedImage.TYPE_3BYTE_BGR) {
			blurredImg =
				new BufferedImage(
					img.getWidth(),
					img.getHeight(),
					img.getType());
		}
		blurredImg = blurOp.filter(img, blurredImg);
		if (blurredImg == null) {
			util.dprintln(2, "ERROR(cropAndScale): error in scale");
			throw new ImageOpException("Unable to scale");
		}
		img = blurredImg;
	}

	public void crop(int x_off, int y_off, int width, int height)
		throws ImageOpException {
		// setup Crop
		BufferedImage croppedImg = img.getSubimage(x_off, y_off, width, height);
		util.dprintln(
			3,
			"CROP:" + croppedImg.getWidth() + "x" + croppedImg.getHeight());
		//DEBUG
		//    util.dprintln(2, "  time "+(System.currentTimeMillis()-startTime)+"ms");
		if (croppedImg == null) {
			util.dprintln(2, "ERROR(cropAndScale): error in crop");
			throw new ImageOpException("Unable to crop");
		}
		img = croppedImg;
	}

	public void enhance(float mult, float add)
		throws ImageOpException { /* Only one constant should work regardless of the number of bands 
				 * according to the JDK spec.
				 * Doesn't work on JDK 1.4 for OSX and Linux (at least).
				 */ /*		RescaleOp scaleOp =
							new RescaleOp(
								(float)mult, (float)add,
								null);
						scaleOp.filter(img, img);
				*/ /* The number of constants must match the number of bands in the image.
				 */
		int ncol = img.getColorModel().getNumColorComponents();
		float[] dm = new float[ncol];
		float[] da = new float[ncol];
		for (int i = 0; i < ncol; i++) {
			dm[i] = (float) mult;
			da[i] = (float) add;
		}
		RescaleOp scaleOp = new RescaleOp(dm, da, null);
		scaleOp.filter(img, img);
	}

	public void enhanceRGB(float[] rgbm, float[] rgba)
		throws ImageOpException { /* The number of constants must match the number of bands in the image.
				 * We do only 3 (RGB) bands.
				 */
		int ncol = img.getColorModel().getNumColorComponents();
		if ((ncol != 3) || (rgbm.length != 3) || (rgba.length != 3)) {
			util.dprintln(
				2,
				"ERROR(enhance): unknown number of color bands or coefficients ("
					+ ncol
					+ ")");
			return;
		}
		RescaleOp scaleOp =
			new RescaleOp(rgbOrdered(rgbm), rgbOrdered(rgba), null);
		scaleOp.filter(img, img);
	} /** Ensures that the array f is in the right order to map the images RGB components. 
					 */
	public float[] rgbOrdered(float[] fa) {
		float[] fb = new float[3];
		int t = img.getType();
		if ((t == BufferedImage.TYPE_3BYTE_BGR)
			|| (t == BufferedImage.TYPE_4BYTE_ABGR)
			|| (t == BufferedImage.TYPE_4BYTE_ABGR_PRE)) {
			// BGR Type (actually it looks like RBG...)
			fb[0] = fa[0];
			fb[1] = fa[2];
			fb[2] = fa[1];
		} else {
			fb = fa;
		}
		return fb;
	}

	public void rotate(double angle) throws ImageOpException {
		// setup rotation
		double rangle = Math.toRadians(angle);
		// create offset to make shure the rotated image has no negative coordinates
		double w = img.getWidth();
		double h = img.getHeight();
		AffineTransform trafo = new AffineTransform();
		// center of rotation 
		double x = (w / 2);
		double y = (h / 2);
		trafo.rotate(rangle, x, y);
		// try rotation to see how far we're out of bounds
		AffineTransformOp rotOp = new AffineTransformOp(trafo, interpol);
		Rectangle2D rotbounds = rotOp.getBounds2D(img);
		double xoff = rotbounds.getX();
		double yoff = rotbounds.getY();
		// move image back in line
		trafo.preConcatenate(
			AffineTransform.getTranslateInstance(-xoff, -yoff));
		// transform image
		rotOp = new AffineTransformOp(trafo, interpol);
		BufferedImage rotImg = rotOp.filter(img, null);
		// calculate new bounding box
		//Rectangle2D bounds = rotOp.getBounds2D(img);
		if (rotImg == null) {
			util.dprintln(2, "ERROR: error in rotate");
			throw new ImageOpException("Unable to rotate");
		}
		img = rotImg;
		// crop new image (with self-made rounding)
		/* img =
			rotImg.getSubimage(
				(int) (bounds.getX()+0.5),
				(int) (bounds.getY()+0.5),
				(int) (bounds.getWidth()+0.5),
				(int) (bounds.getHeight()+0.5));
		*/
	}

	public void mirror(double angle) throws ImageOpException {
		// setup mirror
		double mx = 1;
		double my = 1;
		double tx = 0;
		double ty = 0;
		if (Math.abs(angle - 0) < epsilon) { // 0 degree
			mx = -1;
			tx = getWidth();
		} else if (Math.abs(angle - 90) < epsilon) { // 90 degree
			my = -1;
			ty = getHeight();
		} else if (Math.abs(angle - 180) < epsilon) { // 180 degree
			mx = -1;
			tx = getWidth();
		} else if (Math.abs(angle - 270) < epsilon) { // 270 degree
			my = -1;
			ty = getHeight();
		} else if (Math.abs(angle - 360) < epsilon) { // 360 degree
			mx = -1;
			tx = getWidth();
		}
		AffineTransformOp mirOp =
			new AffineTransformOp(
				new AffineTransform(mx, 0, 0, my, tx, ty),
				interpol);
		BufferedImage mirImg = mirOp.filter(img, null);
		if (mirImg == null) {
			util.dprintln(2, "ERROR: error in mirror");
			throw new ImageOpException("Unable to mirror");
		}
		img = mirImg;
	}

}
