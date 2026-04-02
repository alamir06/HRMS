
const testController ={
    getTest: (req, res) => {
        res.status(200).json(
            { 
                message: "API Endpoint work well!!",
                title:"IUHRMS"
             });
    }
}
export default testController;