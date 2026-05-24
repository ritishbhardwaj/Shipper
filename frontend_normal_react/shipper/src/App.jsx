
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8000',
})

function App() {
  
  const response = async () => await client.post('/shipment',{params : {'content':"box wire" , 'weight':30, 'destination' :10}})
  // console.log(response);
  return (

    <>
      <p>Hello, Vite + React!</p>
      {console.log(response)}

    </>
  )
}

export default App
