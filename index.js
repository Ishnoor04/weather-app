
const API_KEY = "210b100033046677f3e1f2aef07ae448";
const days = ["sun","mon","tue","wed","thu","fri","sat"];
let selectedCityText;
let selectedCity;

const getCitiesUsingGeolocation = async (searchText)=>{
    const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_KEY}`);
    return response.json();
}

//API calling for current time weather
const getCurrentWeatherData = async ({lat,lon,name})=>{
    const url = lat && lon ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric` : `https://api.openweathermap.org/data/2.5/weather?q=${name}&appid=${API_KEY}&units=metric`
    const response = await fetch(url);
    // console.log(response.json());
    return response.json()
}

//API calling for hourly weather data
const getHourlyWeatherData = async ({name : city})=>{
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
    const data = await response.json();
    return data.list.map(forecast => {
        const {main: {temp,temp_max,temp_min},dt,dt_txt,weather: [{description,icon}]} = forecast;
        return {temp,temp_max,temp_min,dt,dt_txt,description,icon}
    })
}



const tempFormat = (temp) => `${temp?.toFixed(1)}°`
const iconFormat = (icon) => `http://openweathermap.org/img/wn/${icon}@2x.png`

const loadCurrentForecast = ({name,main :{temp,temp_max,temp_min},weather:[{description}]})=>{
    const currentForecastElement = document.querySelector("#current-forecast");
    currentForecastElement.querySelector(".name").textContent = name;
    currentForecastElement.querySelector(".temp").textContent = tempFormat(temp);
    currentForecastElement.querySelector(".description").textContent = description;
    currentForecastElement.querySelector(".high-low").textContent = `High: ${tempFormat(temp_max)}  Low: ${tempFormat(temp_min)}`;
}

const loadHourlyForecast = ({main:{temp: tempNow}, weather:[{icon: iconNow}]} ,hourlyWeather) => {
    let dataFor12Hours = hourlyWeather.slice(2,14);
    const timeFormat = Intl.DateTimeFormat("en",{
        hour12: true, hour:"numeric"
    })
    const hourlyContainerElement = document.querySelector(".hourly-container");
    let innerHTMLString = `<article>
    <h3 class="time">Now</h3>
    <img class="icon" src="${iconFormat(iconNow)}" alt="">
    <p class="hourly-temp">${tempFormat(tempNow)}</p>
</article>`;
    for(let {temp,icon,dt_txt} of dataFor12Hours){

        innerHTMLString += `<article>
        <h3 class="time">${timeFormat.format(new Date(dt_txt))}</h3>
        <img class="icon" src="${iconFormat(icon)}" alt="">
        <p class="hourly-temp">${tempFormat(temp)}</p>
    </article>`
    }
    hourlyContainerElement.innerHTML = innerHTMLString;
} 

const loadFeelsLike = ({main: {feels_like}}) => {
    let container = document.querySelector("#feels-like");
    container.querySelector(".feels-like-temp").textContent= tempFormat(feels_like)
}

const loadHumidity = ({main:{humidity}}) =>{
    let humidityElement = document.querySelector("#humidity");
    humidityElement.querySelector(".humidity-value").textContent = `${humidity}%`
}

const loadData = async ()=>{
    const currentWeather = await getCurrentWeatherData(selectedCity);
    loadCurrentForecast(currentWeather);
    const hourlyWeather = await getHourlyWeatherData(currentWeather);
    loadHourlyForecast(currentWeather,hourlyWeather);
    loadFiveDayForecast(hourlyWeather)
    loadFeelsLike(currentWeather);
    loadHumidity(currentWeather);
}

const loadForecastUsingGeolocation = ()=> {
    navigator.geolocation.getCurrentPosition(({coords})=>{
        const {latitude:lat,longitude:lon} = coords;
        selectedCity = {lat,lon};
        loadData();
    },error=>console.log(error))
}
// smjhna h
const calculateDayWiseForecast = (hourlyWeather)=>{
    let dayWiseForecast = new Map();
    for(let forecast of hourlyWeather){
        const date = forecast.dt_txt.split(" ")[0];
        const dayOfTheWeek = days[new Date(date).getDay()];
        // console.log(dayOfTheWeek);
        if(dayWiseForecast.has(dayOfTheWeek)){
            let forecastForTheDay = dayWiseForecast.get(dayOfTheWeek);
            forecastForTheDay.push(forecast);
            dayWiseForecast.set(dayOfTheWeek,forecastForTheDay);
        }else{
            dayWiseForecast.set(dayOfTheWeek,[forecast]);
        }
    }
        for(let [key,value] of dayWiseForecast) {
            let minTemp = Math.min(...Array.from(value,val=>val.temp_min));
            let maxTemp = Math.max(...Array.from(value,val=>val.temp_max));
            dayWiseForecast.set(key,{temp_min: minTemp, temp_max: maxTemp, icon: value.find(val=>val.icon).icon});
        }
        console.log(dayWiseForecast);
        return dayWiseForecast;
}

const loadFiveDayForecast = (hourlyWeather)=>{
    const dayWiseForecast = calculateDayWiseForecast(hourlyWeather);
    const container = document.querySelector(".fiveday-forecast-container");
    let dayWiseInfo = "";
    Array.from(dayWiseForecast).map(([day,{temp_max,temp_min,icon}],index)=>{
        if(index<5) {
            dayWiseInfo += `<article class="day-wise-forecast">
            <h3 class="day">${index === 0 ? "today" : day}</h3>
            <img src="${iconFormat(icon)}" alt="">
            <p class="fiveday-low">${tempFormat(temp_min)}</p>
            <p class="fiveday-high">${tempFormat(temp_max)}</p>
        </article>`;
        }
    });
    container.innerHTML = dayWiseInfo;
}

function debounce(func){
    let timer;
    return (...args)=>{
        clearTimeout(timer);
        timer = setTimeout(()=>{
            func.apply(this, args)
        },500);
    }
}

const handleCitySelection = (event) =>{
    selectedCityText = event.target.value;
    let options = document.querySelectorAll("#cities>option");
    if(options?.length) {
        let selectedOption = Array.from(options).find(opt=>opt.value === selectedCityText);
        selectedCity = JSON.parse(selectedOption.getAttribute("data-city-details"));
        loadData();
    }
}

const onSearchChange = async (event)=>{
    let {value} = event.target;
    if(!value) {
        selectedCity = null;
        selectedCityText = ""
    }
    if(value && selectedCityText !== value) {
        const listOfCities = await getCitiesUsingGeolocation(value);
        let options = "";
        for(let {lat,lon,name,state,country} of listOfCities) {
            options += `<option data-city-details='${JSON.stringify({lat,lon,name})}' value="${name}, ${state}, ${country}"></option>`
        }
        document.querySelector("#cities").innerHTML = options;
    }
}

const debounceSearch = debounce((event)=>onSearchChange(event))

document.addEventListener("DOMContentLoaded",async ()=>{
    loadForecastUsingGeolocation();
    const searchInput = document.querySelector("#search");
    searchInput.addEventListener("input",debounceSearch);
    searchInput.addEventListener("change",handleCitySelection);


    
})  
