// weather.js
fetch('https://v2.jinrishici.com/info')
    .then(response => response.json())
    .then(data => 
    {
      try {
          const region = data.data.region;
          const weatherData = data.data.weatherData;
          const weatherData2 = region  + " " + weatherData.weather + " " + weatherData.temperature + "℃" ;
          const mm_tags = data.data.tags;
          console.log(weatherData2);
          console.log(mm_tags);
          document.getElementById('weatherData').innerText = weatherData2;
          document.getElementById('weatherTags').innerText = mm_tags;
      } 
      catch(error) 
      {
        document.getElementById('weather-info').style.visibility="hidden";
        console.log("something wrong,please check ^_^");
      }
    })
    .catch(error => 
    {
        console.error("Error fetching data:", error);
        document.getElementById('info').innerText = '无法获取天气信息。';
    });
