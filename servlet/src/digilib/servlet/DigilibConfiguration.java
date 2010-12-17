/*
 * DigilibConfiguration -- Holding all parameters for digilib servlet.
 * 
 * Digital Image Library servlet components
 * 
 * Copyright (C) 2001, 2002 Robert Casties (robcast@mail.berlios.de)
 * 
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option)
 * any later version.
 * 
 * Please read license.txt for the full details. A copy of the GPL may be found
 * at http://www.gnu.org/copyleft/lgpl.html
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 59 Temple
 * Place, Suite 330, Boston, MA 02111-1307 USA
 *  
 */

package digilib.servlet;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.Map.Entry;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;

import org.apache.log4j.BasicConfigurator;
import org.apache.log4j.Logger;

import digilib.image.DocuImage;
import digilib.image.DocuImageImpl;
import digilib.io.FileOps;
import digilib.io.ImageFile;
import digilib.io.XMLListLoader;
import digilib.util.Parameter;
import digilib.util.ParameterMap;

/**
 * Class to hold the digilib servlet configuration parameters. The parameters
 * can be read from the digilib-config file and be passed to other servlets or
 * beans. <br>errorImgFileName: image file to send in case of error. <br>
 * denyImgFileName: image file to send if access is denied. <br>baseDirs:
 * array of base directories in order of preference (prescaled versions first).
 * <br>useAuth: use authentication information. <br>authConfPath:
 * authentication configuration file. <br>... <br>
 * 
 * @author casties
 *  
 */
public class DigilibConfiguration extends ParameterMap {

	/** DocuImage class instance */
	private Class<DocuImageImpl> docuImageClass = null;

	/** DocuImage instance */
	private static DocuImage docuImage = null;

	/** Log4J logger */
	private Logger logger = Logger.getLogger("digilib.config");

	/**
	 * Default constructor defines all parameters and their default values.
	 *  
	 */
	public DigilibConfiguration() {
		super(20);
		// we start with a default logger config
		BasicConfigurator.configure();
		initParams();
	}

	/**
	 * 
	 */
	protected void initParams() {
		/*
		 * Definition of parameters and default values. System parameters that
		 * are not read from config file have a type 's'.
		 */

		// digilib servlet version
		newParameter(
			"servlet.version",
			digilib.servlet.Scaler.getVersion(),
			null,
			's');
		// configuration file location
		newParameter("servlet.config.file", null, null, 's');
		// DocuDirCache instance
		newParameter("servlet.dir.cache", null, null, 's');
		// DocuImage class instance
		newParameter(
			"servlet.docuimage.class",
			digilib.image.JAIDocuImage.class,
			null,
			's');
		// AuthOps instance for authentication
		newParameter("servlet.auth.op", null, null, 's');
        // Executor for image operations
        newParameter("servlet.worker.imageexecutor", null, null, 's');
        // Executor for PDF operations
        newParameter("servlet.worker.pdfexecutor", null, null, 's');
        // Executor for PDF-image operations
        newParameter("servlet.worker.pdfimageexecutor", null, null, 's');

		/*
		 * parameters that can be read from config file have a type 'f'
		 */

		// image file to send in case of error
		newParameter(
			"error-image",
			new File("img/digilib-error.png"),
			null,
			'f');
		// image file to send if access is denied
		newParameter(
			"denied-image",
			new File("img/digilib-denied.png"),
			null,
			'f');
		// image file to send if image file not found
		newParameter(
			"notfound-image",
			new File("img/digilib-notfound.png"),
			null,
			'f');
		// base directories in order of preference (prescaled versions last)
		String[] bd = { "/docuserver/images", "/docuserver/scaled/small" };
		newParameter("basedir-list", bd, null, 'f');
		// use authentication information
		newParameter("use-authorization", Boolean.FALSE, null, 'f');
		// authentication configuration file
		newParameter("auth-file", new File("digilib-auth.xml"), null, 'f');
		// sending image files as-is allowed
		newParameter("sendfile-allowed", Boolean.TRUE, null, 'f');
		// Type of DocuImage instance
		newParameter(
			"docuimage-class",
			"digilib.image.JAIDocuImage",
			null,
			'f');
		// part of URL used to indicate authorized access
		newParameter("auth-url-path", "authenticated/", null, 'f');
		// degree of subsampling on image load
		newParameter("subsample-minimum", new Float(2f), null, 'f');
		// default scaling quality
		newParameter("default-quality", new Integer(1), null, 'f');
		// use mapping file to translate paths
		newParameter("use-mapping", Boolean.FALSE, null, 'f');
		// mapping file location
		newParameter("mapping-file", new File("digilib-map.xml"), null, 'f');
		// log4j config file location
		newParameter("log-config-file", new File("log4j-config.xml"), null, 'f');
		// maximum destination image size (0 means no limit)
		newParameter("max-image-size", new Integer(0), null, 'f');
		// number of working threads
		newParameter("worker-threads", new Integer(1), null, 'f');
		// max number of waiting threads
		newParameter("max-waiting-threads", new Integer(20), null, 'f');
		// number of pdf-generation threads
		newParameter("pdf-worker-threads", new Integer(1), null, 'f');
		// max number of waiting pdf-generation threads
		newParameter("pdf-max-waiting-threads", new Integer(20), null, 'f');
		// number of pdf-image generation threads
		newParameter("pdf-image-worker-threads", new Integer(1), null, 'f');
		// max number of waiting pdf-image generation threads
		newParameter("pdf-image-max-waiting-threads", new Integer(10), null, 'f');
        // PDF generation temp directory
        newParameter("pdf-temp-dir", "pdf_temp", null, 'f');
        // PDF generation cache directory
        newParameter("pdf-cache-dir", "pdf_cache", null, 'f');
        // PDF generation cache directory
        newParameter("pdf-cache-dir", "pdf_cache", null, 'f');
	}

	/**
	 * Constructor taking a ServletConfig. Reads the config file location from
	 * an init parameter and loads the config file. Calls <code>readConfig()</code>.
	 * 
	 * @see readConfig()
	 */
	public DigilibConfiguration(ServletConfig c) throws Exception {
		this();
		readConfig(c);
	}

	/**
	 * read parameter list from the XML file in init parameter "config-file"
	 * or file digilib-config.xml
	 */
	public void readConfig(ServletConfig c) throws Exception {

		/*
		 * Get config file name. The file name is first looked for as an init
		 * parameter, then in a fixed location in the webapp.
		 */
		if (c == null) {
			// no config no file...
			return;
		}
		String fn = c.getInitParameter("config-file");
		if (fn == null) {
			fn = ServletOps.getConfigFile("digilib-config.xml", c);
			if (fn == null) {
				logger.fatal("readConfig: no param config-file");
				throw new ServletException("ERROR: no digilib config file!");
			}
		}
		File f = new File(fn);
		// setup config file list reader
		XMLListLoader lilo =
			new XMLListLoader("digilib-config", "parameter", "name", "value");
		// read config file into HashMap
		Map<String,String> confTable = lilo.loadURL(f.toURL().toString());

		// set config file path parameter
		setValue("servlet.config.file", f.getCanonicalPath());

		/*
		 * read parameters
		 */

		for (Entry<String, String> confEntry: confTable.entrySet()) {
			Parameter p = get(confEntry.getKey());
			if (p != null) {
				if (p.getType() == 's') {
					// type 's' Parameters are not overwritten.
					continue;
				}
				if (!p.setValueFromString(confEntry.getValue())) {
					/*
					 * automatic conversion failed -- try special cases
					 */

					// basedir-list
					if (confEntry.getKey().equals("basedir-list")) {
						// split list into directories
						String[] sa = FileOps.pathToArray(confEntry.getValue());
						if (sa != null) {
							p.setValue(sa);
						}
					}
				}
			} else {
				// parameter unknown -- just add
				newParameter(confEntry.getKey(), null, confEntry.getValue(), 'f');
			}
		}
		// initialise static DocuImage instance
		DigilibConfiguration.docuImage = getDocuImageInstance();
	}

	/**
	 * Creates a new DocuImage instance.
	 * 
	 * The type of DocuImage is specified by docuImageType.
	 * 
	 * @return DocuImage
	 */
	@SuppressWarnings("unchecked")
    public DocuImage getDocuImageInstance() {
		DocuImageImpl di = null;
		try {
			if (docuImageClass == null) {
				docuImageClass = (Class<DocuImageImpl>) Class.forName(getAsString("docuimage-class"));
			}
			di = docuImageClass.newInstance();
		} catch (Exception e) {
		}
		return di;
	}

	/**
     * Check image size and type and store in ImageFile imgf
     * 
	 * @param imgf
	 * @return
	 * @throws IOException
	 */
	public static ImageFile docuImageIdentify(ImageFile imgf) throws IOException {
		return docuImage.identify(imgf);
	}
	
	/**
	 * @return Returns the docuImageClass.
	 */
	public Class<DocuImageImpl> getDocuImageClass() {
		return docuImageClass;
	}

	/**
	 * @param docuImageClass The docuImageClass to set.
	 */
	public void setDocuImageClass(Class<DocuImageImpl> docuImageClass) {
		this.docuImageClass = docuImageClass;
	}
}
