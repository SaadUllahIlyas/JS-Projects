
            var tools = [0,0,0]                     //pen, eraser, fill
            var canvasMouseX = 0;                   //position of the mouse on the canvas element
            var canvasMouseY = 0;
            var isDrawing = false;                  
            var color = '#FF0000'                   //color wich is used to paint
            var pickedColor = '#FF0000'             //color of the colorpicker
            var currentPattern = new Array(30);     //stores the displayed pattern
            var prevX = -1;                         //used to prevent spam
            var prevY = -1;
            var names;                              //stores the names of the patterns
            var live = false;                       //draw live on canvas or display saved patterns

            function changeTool(id_number){
                for(let i = 0; i < tools.length; i++){
                    tools[i] = 0;
                }
                tools[id_number] = 1;
                
                //highlight selected tool
                tools[0] == 0 ? (document.getElementById('pencil').style.backgroundColor = '#FFFFFF00') : (document.getElementById('pencil').style.backgroundColor = '#524561');
                tools[1] == 0 ? document.getElementById('eraser').style.backgroundColor = '#FFFFFF00' : document.getElementById('eraser').style.backgroundColor = '#524561';
                tools[2] == 0 ? document.getElementById('fill').style.backgroundColor = '#FFFFFF00' : document.getElementById('fill').style.backgroundColor = '#524561';
            }

            function changeColor(tempcolor){
                color = tempcolor;
            }

            function changeMode(){
                live = !live;
                //highlight selection if true
                live ? document.getElementById('live').style.backgroundColor = '#524561' : document.getElementById('live').style.backgroundColor = '#FFFFFF00';
                
                //new POST request to the arduino to change mode
                var xhr = new XMLHttpRequest();
                    xhr.open("POST", "mode", true);
                    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
                    xhr.send("mode="+live);
            }

            function draw(x,y,drawColor,post){
                var canvas = document.getElementById('game');
                var ctx = canvas.getContext('2d');
                var rect = canvas.getBoundingClientRect();
                var size = (rect.width / 30);

                /*
                What comes next is some calculation to convert the x/y of the pixel to an index of an array with 255 pixels on the arduino
                This is a little bit complicated because we connected the leds in a snake pattern.
                */

                if(y%2 == 0){                                          
                    var index = 255-(y*30+(15-x));
                }
                else{
                    var index = 255-(y*30+x);
                }

                if(post && live){
                    var xhr = new XMLHttpRequest();
                    xhr.open("POST", "live", true);
                    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
                    xhr.send("i="+index+"&c="+drawColor.slice(1));
                }
                
                                //update currentPattern array with the new color and draw new pixel on canvas
                currentPattern[y][x] = drawColor;

                x = x * size;
                y =  y* size;
                ctx.fillStyle= drawColor;
                if(drawColor == '#000000'||drawColor == '0x000000'){    //black pixel = transparent pixel (looks better)
                    ctx.clearRect(x,y,size,size);
                }
                else{
                    ctx.fillRect(x,y,size,size);
                }
                drawGrid(0,0);                                          //redraw the grid
            }

            
            function drawGrid(x,y){
                var canvas = document.getElementById('game');
                var ctx = canvas.getContext('2d');
                var rect = canvas.getBoundingClientRect();
                var size = (rect.width / 30);
                for(var i = 0; i < 30; i++){
                    for(var j = 0; j < 30; j++){
                        x = i * size;
                        y =  j* size;
                        ctx.strokeRect(x,y,size,size);
                    }
                }  
            }

            function fill(x,y,referenceColor){
                /*
                This is a very basic fill algorithm making use of recursion. I added a little delay to make it
                animate a little. Unfortunately the POST requests that "draw()" makes are quite slow
                */
                setTimeout(function(){
                    if(x>=0 && x<=29 && y>=0 && y <=29){
                    if(currentPattern[y][x] == referenceColor){
                        draw(x,y,color,1);
                        fill(x,y-1,referenceColor);
                        fill(x,y+1,referenceColor);
                        fill(x-1,y,referenceColor);
                        fill(x+1,y,referenceColor)
                    }
                }
                },40)
            }   

            function clearCanvas(){
                var canvas = document.getElementById('game');
                var ctx = canvas.getContext('2d');
                ctx.clearRect(0,0,canvas.width,canvas.height);

                for(var i=0; i<30; i++){
                        for(var j=0; j<30; j++){
                            currentPattern[i][j] = '#000000'
                        }
                    }
                drawGrid(0,0);
                
                if(live){
                    var xhr = new XMLHttpRequest();
                    xhr.open("POST", "live", true);
                    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
                    xhr.send("cl=1");
                }
            }

            function getNames(){
                var selection = document.getElementById("selection");

                //make a new GET request to the arduino which reads the names from the SD card
                var xmlHttp = new XMLHttpRequest();
                xmlHttp.open( "GET", "get", false );
                xmlHttp.send();
                console.log(xmlHttp.responseText);

                //response is JSON array which we parse into a variable and then
                //make appear in the selection of the HTML
                names = JSON.parse(xmlHttp.responseText);
                for(var i=0; i<names.length; i++){
                    if(!(names[i].includes("^"))){
                    var option = document.createElement('option');
                    option.value = i;
                    option.innerHTML = names[i];
                    selection.appendChild(option);
                    }
                }
            }

            function save(){
                var name = window.prompt("Enter a name:","mario");
                if(name.length > 15){
                        window.alert("Name can't be longer than 15 characters :(")
                    }
                else{
                    var xhr = new XMLHttpRequest();
                        xhr.open("POST", "save", true);
                        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
                        var message = "pt=";

                        //convert into format that the arduino uses
                        for(var i=15; i>=0; i--){
                            if(i%2){     
                                for(var j=15; j>=0; j--){
                                    message += "0x"+currentPattern[i][j].slice(1)+"\n";
                                }                                  
                            }
                            else{
                                for(var j=0; j<30; j++){
                                    message += "0x"+currentPattern[i][j].slice(1)+"\n";
                                }                                 
                            }
                    }
                    message += "&name=" + name;
                    xhr.send(message);
                    }

            }

            function deletePattern(){
                var name = window.prompt("Enter the name of the pattern that you want to delete:","mario");
                //check if name is valid
                if(!names.includes(name)){
                        window.alert("There is no pattern with this name :(")
                    }
                else{
                    var xhr = new XMLHttpRequest();
                        xhr.open("POST", "delete", true);
                        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
                        var message = "name=" + name;
                        xhr.send(message);
                    }
            }

            function loadPattern(){
                //get the value of the select tag
                var select = document.getElementById("selection");  
                var id = select.value;

                //new Request to the arduino
                var xmlHttp = new XMLHttpRequest();
                xmlHttp.open( "POST", "load", false ); // false for synchronous request
                xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
                var message = "id="+id;
                xmlHttp.send(message);
                
                //parse the response and show it on the screen
                var loadedPattern = JSON.parse(xmlHttp.responseText);
                for(var i=15; i>=0;i--){
                    if(!(i%2)){     
                        for(var j=15; j>=0; j--){
                            console.log(loadedPattern.length);
                            draw(j,i,'#'+loadedPattern[255-(i*30+(15-j))].slice(2),false);
                            console.log(j,i);
                        }                                 
                    }
                    else{
                        for(var j=0; j<30; j++){
                            draw(j,i,'#'+loadedPattern[255-(i*30+j)].slice(2),false);
                        }                               
                    }
                }
            }

            //gets executed when the web page is loaded
            function initialise(){
                //get the parameters of the canvas and draw the grid
                var canvas = document.getElementById("game");
                    var size = canvas.width;
                    canvas.height = size;
                    canvas.width = size;
                    drawGrid(0,0);
                    changeTool('0');

                    //create a 2 dimensional array to store the current pattern
                    for(var i=0; i<30; i++){
                        currentPattern[i] = new Array(30);
                    }
                    for(var i=0; i<30; i++){
                        for(var j=0; j<30; j++){
                            currentPattern[i][j] = '#000000'
                        }
                    }
                    //get the names and change the mode to live drawing
                    getNames();
                    changeMode();
            }

            //add the event handlers when the webpage is fully loaded
            document.addEventListener("DOMContentLoaded", function(event) {
                console.log("DOM fully loaded and parsed");

                canvas.addEventListener("mousemove", function(e){
                    if(isDrawing == true){
                        var canvas = document.getElementById("game");
                        var rect = canvas.getBoundingClientRect();
                        var x = e.clientX - rect.left;                      //calculate wich of the 256 pixel the mouse is over
                        var y = e.clientY - rect.top;
                        x = Math.floor(x*(30/rect.width));                  //calculate wich of the 256 pixel the mouse is over
                        y = Math.floor(y*(30/rect.height));
                        if(x != prevX || y != prevY){                       //functions only execute when new square is selected
                            if(tools[0]==1){
                                draw(x,y,color,1);
                            }
                            else if(tools[1]==1){
                                draw(x,y,'#000000',1);
                            }
                        }
                        prevX = x;
                        prevY = y;
                    }
                });

                canvas.addEventListener("mousedown", function(e){
                    var canvas = document.getElementById("game");
                    var rect = canvas.getBoundingClientRect();
                    var x = e.clientX - rect.left;                            //calculate wich of the 256 pixel the mouse is over
                    var y = e.clientY - rect.top;
                    x = Math.floor(x*(30/rect.width));                        //calculate wich of the 256 pixel the mouse is over
                    y = Math.floor(y*(30/rect.height));

                    if(x != prevX || y != prevY){                             //functions only execute when new square is selected
                        if(tools[0]==1){
                            draw(x,y,color,1);
                            isDrawing = true;
                        }
                        else if(tools[1]==1){
                            draw(x,y,'#000000',1);
                            isDrawing = true;
                        }
                        else if(tools[2]==1){          
                            fill(x,y,currentPattern[y][x]);
                        }
                    }
                    prevX = x;
                    prevY = y;
                });

                canvas.addEventListener("mouseup", function(e){
                    isDrawing = false;
                });

                canvas.addEventListener("mouseout", function(e){                    //executes when mouse leaves canvas element
                    isDrawing = false;
                });

                var colorpicker = document.getElementById("colorpicker");           
                colorpicker.addEventListener("input", function(){
                    pickedColor = colorpicker.value;
                    color = pickedColor;
                    document.getElementById('pickedColor').style.backgroundColor = color;
                });
            });


            
        