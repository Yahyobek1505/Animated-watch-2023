
    setInterval(() => {
        
    let hours = document.getElementById('hours');
    let minuts = document.getElementById('minuts');
    let seconds = document.getElementById('seconds');
    let ampm = document.getElementById('ampm');

    let hh = document.getElementById('hh');
    let mm = document.getElementById('mm');
    let ss = document.getElementById('ss');

    let hr_dot = document.querySelector('.hr_dot');
    let min_dot = document.querySelector('.min_dot');
    let sec_dot = document.querySelector('.sec_dot');

    let h = new Date().getHours();
    let m = new Date().getMinutes();
    let s = new Date().getSeconds();
    let am = h >= 12 ? "PM" : "AM";
    
    // 24 soatik vaqt
    if (h>12) {
        h=h-12;
    }
    
    // nol qo'shish
    h = (h<10) ? "0"+h:h;
    m = (m<10) ? "0"+m:m;
    s = (s<10) ? "0"+s:s;

    hours.innerHTML = h + "<br><span>Hours</br></span>";
    minuts.innerHTML = m + "<br><span>Seconds</br></span>";
    seconds.innerHTML = s +"<br><span>Minutes</br></span>";
    ampm.innerHTML = am;

    hh.style.strokeDashoffset = 440 - (440 * h) / 12;
    // 12 soat
    mm.style.strokeDashoffset = 440 - (440 * m) / 60;
    // 60 minuts
    ss.style.strokeDashoffset = 440 - (440 * s) / 60;
    // 60 seconds


    hr_dot.style.transform = `rotate(${h * 30}deg)`;
    // 360/12=30
    min_dot.style.transform = `rotate(${m * 6}deg)`;
    // 360/60=6
    sec_dot.style.transform = `rotate(${s * 6}deg)`;
    // 360/60=6
     
},);

