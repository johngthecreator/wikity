import { Link, Route, Switch } from 'wouter'
import Wiki from './pages/Wiki'

function App() {
  return (
    <div className='h-screen flex flex-col'>
      <nav className='w-full p-5 space-x-2 border-b'>
        <Link href="/">Wiki</Link>
        <Link href="/users/1">Profile</Link>
        <Link href="/about">About</Link>
      </nav>


      {/* 
      Routes below are matched exclusively -
      the first matched route gets rendered
    */}
      <Switch>
        <Route path="/" component={Wiki} />
        <Route path="/about">About Us</Route>
        <Route path="/users/:name">
          {(params) => <>Hello, {params.name}!</>}
        </Route>

        {/* Default route in a switch */}
        <Route>404: No such page!</Route>
      </Switch>
    </div>
  )
}

export default App
