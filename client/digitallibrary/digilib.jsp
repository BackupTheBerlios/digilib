<%@ page language="java" %>

<%!
// authentication stuff - robert
// -----------------------------
// create DocumentBean instance for all JSP requests
digilib.servlet.DocumentBean docBean = new digilib.servlet.DocumentBean();

// initialize DocumentBean instance in JSP init
public void jspInit() {
    try {
        // set servlet init-parameter
        docBean.setConfig(getServletConfig());
    } catch (javax.servlet.ServletException e) {
        System.out.println(e);
    }
}
%>




<%

// parsing the query
// -----------------

//digilib.servlet.DigilibRequest dlRequest = new digilib.servlet.DigilibRequest(request);
digilib.servlet.DigilibRequest dlRequest = new digilib.servlet.DigilibRequest();
dlRequest.setWithRequest(request);
// check if authentication is needed and redirect if necessary
docBean.doAuthentication(dlRequest, response);

%>

<%

// the different levels of presentation
// ------------------------------------


// level 3 representation hack - lugi
      // it would be much more interesting to check
      // if the sidebar is actually installed and in
      // the case it isn't - automatically do it.
      // however this requires client-side tests and
      // so slows down everything.
      // we might want to talk about it for a future
      // release

if (dlRequest.getLv() == 3) {
  String userAgent = request.getHeader("User-Agent").toLowerCase();
  
  if (userAgent.indexOf("mozilla/5.0") == 0) {

    // mozilla 5 that does not support xul-sidebars
    if (userAgent.indexOf("opera")     > -1) dlRequest.setLv(2);
    if (userAgent.indexOf("chimera")   > -1) dlRequest.setLv(2);
    if (userAgent.indexOf("camino")    > -1) dlRequest.setLv(2);
    if (userAgent.indexOf("konqueror") > -1) dlRequest.setLv(2);
    if (userAgent.indexOf("safari")    > -1) dlRequest.setLv(2);
    if (userAgent.indexOf("galeon")    > -1) dlRequest.setLv(2);
    if (userAgent.indexOf("skipstone") > -1) dlRequest.setLv(2);
    if (userAgent.indexOf("k-meleon")  > -1) dlRequest.setLv(2);
    if (userAgent.indexOf("firebird")  > -1) dlRequest.setLv(2);

    // the chance is quite big, that the browser supports xul-sidebars
    dlRequest.setLv(1);
  
  } else {

    // redirect to level 2 because of definitive lack of sidebar support
    dlRequest.setLv(2);
  }
}



switch (dlRequest.getLv()) {

  // LEVEL 0 --------------------------------------------------------------

  case 0:
%>

<%
    break; // level 0




  // LEVEL 1 --------------------------------------------------------------

  case 1:
%>

<%
    // checking if the height and width of this client is already known
    if ((dlRequest.getDw() == 0) || (dlRequest.getDh() == 0)) {
%>

<html>
<head>
<script language="Javascript">

function redirect() {

  if (document.body) {

    // internet explorer + opera
    client = "&dw=" + (document.body.clientWidth-30) + "&dh=" + (document.body.clientHeight-30);

  } else {

    // mozilla-browsers (netscape 4.xx, netscape 6.xx, etc.)
    client = "&dw=" + (innerWidth-30) + "&dh=" + (innerHeight-30);

  }
<%
  if (dlRequest.isRDF()){
    String strAllParams=dlRequest.getAsString();
%>
    location.replace(document.URL+"?"+"<%=strAllParams%>" + client);
<%
  }else{
%>
    location.replace(document.URL + client);
<%
  }
%>
}

</script>
</head>
<body bgcolor="#666666" onload="redirect()">
</body>
</html>

<%
    } else {

      // add number of pages
      dlRequest.setPt(docBean.getNumPages(dlRequest));

      String imageLocation = dlRequest.getBaseURL() + "/servlet/Scaler/?" + dlRequest.getAsString();
%>

<html>
<head>
<title>Digital Document Library - Alcatraz (Level 1)</title>

<script src="navigation.js" type="text/javascript"> </script>

<!-- modules -->
<script src="modules/pagesTotal.js" type="text/javascript"> </script>
<script src="modules/newReferences.js" type="text/javascript"> </script>
<script src="modules/imago.js" type="text/javascript"> </script>

<script type="text/javascript">

var baseUrl = "<%= dlRequest.getBaseURL() %>";

newParameter('fn', '<%= dlRequest.getFilePath() %>', '', 1);  
newParameter('pn', '<%= dlRequest.getPn() %>', '1', 1);
newParameter('ws', '<%= dlRequest.getWs() %>', '1.0', 1);
newParameter('mo', '<%= dlRequest.getMo() %>', '', 1);
newParameter('mk', '<%= dlRequest.getMk() %>', '', 3);
newParameter('wx', '<%= dlRequest.getWx() %>', '0.0', 2);
newParameter('wy', '<%= dlRequest.getWy() %>', '0.0', 2);
newParameter('ww', '<%= dlRequest.getWw() %>', '1.0', 2);
newParameter('wh', '<%= dlRequest.getWh() %>', '1.0', 2);

newParameter('pt', '<%= dlRequest.getPt() %>', '<%= dlRequest.getPt() %>', 9);

newParameter('brgt', '<%= dlRequest.getBrgt() %>', '0.0', 1);
newParameter('cont', '<%= dlRequest.getCont() %>', '0.0', 1);
newParameter('rot', '<%= dlRequest.getRot() %>', '0.0', 1);
newParameter('rgba', '<%= dlRequest.getRgba_s() %>', '', 1);
newParameter('rgbm', '<%= dlRequest.getRgbm_s() %>', '', 1);

newParameter('ddpix', '<%= dlRequest.getDdpix() %>', '', 9);
newParameter('ddpiy', '<%= dlRequest.getDdpiy() %>', '', 9);

</script>

</head>

<body bgcolor="#666666" onload="init_pagesTotal();">

 <div id="lay1" style="position: absolute; left: 10px; top: 10px; visibility: visible"><img name="pic" src="<%= imageLocation %>" border="0"></div>

 <div id="dot0" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark1.gif" border="0"></div>
 <div id="dot1" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark2.gif" border="0"></div>
 <div id="dot2" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark3.gif" border="0"></div>
 <div id="dot3" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark4.gif" border="0"></div>
 <div id="dot4" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark5.gif" border="0"></div>
 <div id="dot5" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark6.gif" border="0"></div>
 <div id="dot6" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark7.gif" border="0"></div>
 <div id="dot7" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark8.gif" border="0"></div>
 <div id="eck1" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="olinks.gif" border="0"></div>
 <div id="eck2" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="orechts.gif" border="0"></div>
 <div id="eck3" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="ulinks.gif" border="0"></div>
 <div id="eck4" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="urechts.gif" border="0"></div>

</body>

</html>
<%
    }
%>

<%
    break; // level 1




  // LEVEL 2 --------------------------------------------------------------

  case 2:
%>

<%
    // retrieve request in new paramter format and redirect to level 1
    dlRequest.setLv(1);
    String query = "digilib.jsp?" + dlRequest.getAsString();
%>

<html>
<head>
<title>Digital Document Library - Alcatraz (Level 2)</title>
</head>

<frameset cols="*,90" border="0">
  <frame name="mainFrame" src="<%= query %>" scrolling="auto">
  <frameset rows="20,*" border="0">
    <frame name="pageFrame" src="about:blank" scrolling="no" noresize>
    <frame name="rightFrame" src="dlMenu.html" scrolling="no" noresize>
  </frameset>
</frameset>

</html>

<%
    break; // level 2

} // end switch

%>
