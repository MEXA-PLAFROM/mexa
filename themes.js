/* ==================================================
   MEXA THEME SYSTEM
   Auto siang / malam + pilihan user
   ================================================== */

(function(){

"use strict";

const KEY = "mexa-theme";


function setTheme(theme){

  document.documentElement
    .setAttribute(
      "data-mexa-theme",
      theme
    );

  localStorage.setItem(
    KEY,
    theme
  );

}


function getAutoTheme(){

  const hour = new Date().getHours();

  if(hour >= 6 && hour < 18){

    return "arctic";

  }

  return "midnight";

}


function loadTheme(){

  const saved =
    localStorage.getItem(KEY);


  if(saved){

    setTheme(saved);

  } else {

    setTheme(
      getAutoTheme()
    );

  }

}


window.MEXATheme = {

  set:setTheme,

  auto:function(){

    setTheme(
      getAutoTheme()
    );

  },

  current:function(){

    return document.documentElement
      .getAttribute(
        "data-mexa-theme"
      );

  }

};


loadTheme();


console.log(
 "MEXA Theme System aktif"
);


})();
