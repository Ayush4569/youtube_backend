import { connectDB } from "./db/index.js";
import { app } from "./app.js";

connectDB()
.then(()=>{
    app.listen(process.env.PORT,()=>{
        console.log("App running on port :",process.env.PORT);
    })
})
.catch((err)=>{
    console.log("Error connectinf db:",err);
})
