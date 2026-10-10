/* ==========================================
   MEXA THEMES CONTROLLER
========================================== */


(function(){

const THEMES = [

  "midnight",
  "arctic",
  "emerald",
  "sunset",
  "cyberpunk"

];


function setTheme(theme){

  if(!THEMES.includes(theme)){
    theme="midnight";
  }


  document.body.dataset.theme = theme;


  localStorage.setItem(
    "mexa-theme",
    theme
  );


  console.log(
    "MEXA Theme:",
    theme
  );

}




function getAutoTheme(){

  const hour = new Date().getHours();


  /*
    05-10 pagi
    10-16 siang
    16-19 sore
    19-05 malam
  */


  if(hour >= 5 && hour < 10){

    return "arctic";

  }


  if(hour >= 10 && hour < 16){

    return "emerald";

  }


  if(hour >= 16 && hour < 19){

    return "sunset";

  }


  if(hour >= 19 || hour < 5){

    return "midnight";

  }


  return "cyberpunk";

}




function loadTheme(){

  const saved =
    localStorage.getItem(
      "mexa-theme"
    );


  if(saved){

    setTheme(saved);

  }else{

    setTheme(
      getAutoTheme()
    );

  }

}





/* ==========================
   PANEL TEMA
========================== */


function openThemePanel(){


  let panel =
  document.getElementById(
    "mexa-theme-panel"
  );


  if(panel){
    panel.remove();
    return;
  }



  panel =
  document.createElement("div");


  panel.id =
  "mexa-theme-panel";


  panel.innerHTML = `

    <button data-theme="midnight">
    🌙 Midnight
    </button>

    <button data-theme="arctic">
    ❄️ Arctic
    </button>

    <button data-theme="emerald">
    🌿 Emerald
    </button>

    <button data-theme="sunset">
    🌅 Sunset
    </button>

    <button data-theme="cyberpunk">
    ⚡ Cyberpunk
    </button>

  `;


  document.body.appendChild(panel);



  panel.querySelectorAll(
    "button"
  ).forEach(btn=>{


    btn.onclick=function(){

      setTheme(
        this.dataset.theme
      );

      panel.remove();

    };


  });


}






/* ==========================
   HUBUNGKAN TOMBOL TEMA
========================== */


document.addEventListener(
"DOMContentLoaded",
()=>{


 loadTheme();



 const buttons =
 document.querySelectorAll(
 "#mx-control-panel button"
 );



 buttons.forEach(btn=>{


   if(
    btn.textContent.includes("Tema")
   ){

    btn.addEventListener(
      "click",
      openThemePanel
    );

   }


 });


});





window.MEXA_THEME = {

 set:setTheme,

 auto:getAutoTheme

};


})();
