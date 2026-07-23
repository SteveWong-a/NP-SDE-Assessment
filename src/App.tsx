import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient.ts' 

//match supabase schema
interface Task {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'in_review' | 'done'
  user_id: string
}

const COLUMNS = [
  { id: 'todo', title: 'To Do'},
  { id: 'in_progress', title: 'In Progress'},
  { id: 'in_review', title: 'In Review'},
  { id: 'done', title: 'Done'},
]

//Kanban Dashboard 
export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeGuestSession = async () => {
      try {
        //guest sign in
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
        
        if(authError) throw authError
        if(authData.user) {
          setUserId(authData.user.id)
          //function fetch task for user
          fetchTasks(authData.user.id)
        }
      } catch (error) {
        console.error("Error initializing session: ", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeGuestSession()
  }, [])

  const fetchTasks = async (uid: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', uid)
    
    if (error) {
      console.error('Error fetching tasks:', error)
    } else {
      setTasks(data || [])
    }
  }

  //handling loading state
  if(isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading board...</div>
  }

  return (
    <div className = "min-h-screen bg-gray-100 p-8 text-gray-900">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Kanban Board</h1>
        </header>
    
    <div className="flex gap-6 overflow-x-auto pb-4">

        {COLUMNS.map((col) => (
          <div
            key={col.id} //Column background settings
            className="flex-shrink-0 w-80 h-150 bg-gray-200/50 rounded-l p-4 flex flex-col" 
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">{col.title}</h2>
              {/*Optional Element -> Adding task counter badge later */}
            </div>


            <div className="flex-1 min-h-[200px] flex flex-col gap-3">

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <p className="text-sm font-medium">Example Task</p>
              </div>
            
            </div>
          </div>
        ))}

      </div>
    </div>
  )
}