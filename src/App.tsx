import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient.ts'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'

//match supabase schema
interface Task {
  id: string
  title: string
  description?: string
  priority?: 'low' | 'normal' | 'high'
  due_date?: string
  status: 'todo' | 'in_progress' | 'in_review' | 'done'
  user_id: string
}

const COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'done', title: 'Done' },
]

//Kanban Dashboard 
export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  useEffect(() => {
    const initializeGuestSession = async () => {
      try {
        //guest sign in
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously()

        if (authError) throw authError
        if (authData.user) {
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

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault() //prevents page refresh when submit form

    //Don't create new tasp if input is empty or user not loaded
    if (!newTaskTitle.trim() || !userId) return

    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          title: newTaskTitle,
          description: newTaskDesc,
          priority: newTaskPriority,
          due_date: newTaskDueDate,
          status: 'todo',
          user_id: userId,
        }
      ])
      .select() //Call Supabase to return the newly created row

    if (error) {
      console.error('Error adding task:', error)
    } else if (data) {
      setTasks([...tasks, data[0]])
      //clear input field for next task
      setNewTaskTitle('')
      setNewTaskDesc('')
      setNewTaskPriority('normal')
      setNewTaskDueDate('')

    }

  }
  //Function to handle tasks task updates pushed to supabase
  const handleUpdateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!editingTask || !editingTask.title.trim()) return

    const { data, error } = await supabase
      .from('tasks')
      .update({
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        due_date: editingTask.due_date || null,
      })
      .eq('id', editingTask.id)
      .select()

    if (error) {
      console.error('Error updating task:', error)
    } else if (data) {
      setTasks(tasks.map(t => t.id === editingTask.id ? data[0] : t))

      setEditingTask(null)
    }
  }
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (destination.droppableId === source.droppableId) return

    const newStatus = destination.droppableId as Task['status']


    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === draggableId ? { ...task, status: newStatus } : task
      )
    )

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', draggableId)

    if (error) {
      console.error('Error updating task status:', error)
    }

  }

  //handling loading state
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading board...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <header className="mb-8 flex justify-between items-end">

        {/*New Task Form*/}
        <h1 className="text-3xl font-bold tracking-tight mb-6">Kanban Board</h1>

        <form onSubmit={handleAddTask} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Task title (required)"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as any)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="low">Low Priority</option>
              <option value="normal">Normal Priority</option>
              <option value="high">High Priority</option>
            </select>
            <input
              type="date"
              value={newTaskDueDate}
              onChange={(e) => setNewTaskDueDate(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-4 items-start">
            <textarea
              placeholder="Add a description..."
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-12"
            />
            <button
              type="submit"
              className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 font-medium transition-colors h-12"
            >
              Create Task
            </button>
          </div>
        </form>
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter(task => task.status === col.id)

            return (
              <div
                key={col.id} //Column background settings

                className="flex-shrink-0 w-80 min-h-[70vh] bg-gray-200/50 rounded-xl p-4 flex-3 flex-col"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-semibold">{col.title}</h2>
                  {/*Task counter badge  */}
                  <span className="bg-gray-300 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 min-h-[200px] flex flex-col gap-3"
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                                {task.priority && (
                                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                    task.priority === 'low' ? 'bg-green-100 text-green-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                    {task.priority}
                                  </span>
                                )}
                                <button
                                  onClick={() => setEditingTask(task)}
                                  className="text-xs text-gray-400 hover:text-blue-600 transition colors"
                                >
                                  Edit
                                </button>
                              </div>

                              {task.description && (
                                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>
                              )}

                              {task.due_date && (
                                <div className="flex items-center text-xs text-gray-400 font-medium mt-2 pt-2 border-t border-gray-100">
                                  <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}

                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-[500px] max-w-[90%]">
            <h2 className="text-xl font-bold mb-4">Edit Task</h2>

            <form onSubmit={handleUpdateTask} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Title"
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                className="px-4 py-2 rounded-lg border border-gray-300 focus: outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required //Only title required!!!
              />
              <div className="flex gap-4">
                <select
                  value={editingTask.priority || 'normal'}
                  onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as any })}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                </select>

                <input
                  type="date"
                  placeholder="Due Date"
                  value={editingTask.due_date || ''}
                  onChange={(e_ => setEditingTask({ ...editingTask, due_date: e_.target.value }))}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus: outline-none focus:ring-2 focus:ring-blue-500"
                />

                
              </div>

              <textarea
                value={editingTask.description || ''}
                placeholder="Description"
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                className="px-4 py-2 rounded-lg border border-gray-300 focus: outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
              />

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}