// improting dotenv
require('dotenv').config()

// import expres and cors

const express=require('express')
const http=require('http')
const cors=require('cors')
const {Server}=require('socket.io')
const router=require('./Routes/routes')




// create server app intance
const app=express()

const server=http.createServer(app)
const io=new Server(server,{
    cors:{origin:"*"}
})
app.set("io",io)
//userconnecion

io.on("connection",(socket)=>{
    console.log("user Connected :",socket.id);
    socket.on("register",(userId)=>{
        socket.join(userId)
        console.log(`User ${userId} joined their private room`);
    })
    socket.on("disconnect",()=>{
        console.log('Disconnected');
        
    })
})
// importing mongodb connection
require('./Connections/connection')


//confiq cors
app.use(cors())
                                  // middleware
//setting sepecific port
app.use(express.json())

//router

app.use(router)

app.use('/uploads', express.static('uploads'));


const PORT=process.env.PORT || 3000
// CHECKING
const reqHandlers=(req,res)=>{
      res.send("request HIT")
}
//app.use('/req',reqHandlers)
app.use('/req',reqHandlers)
server.listen(PORT, () => {
  console.log(`Server Running at: http://localhost:${PORT}`);
});

