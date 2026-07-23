import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient.ts' 
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'

// Match Supabase schema
interface Task {
  id: string
  title: string
  description?: string
  priority?: 'low' | 'normal' | 'high'
  due_date?: string
  status: 'todo' | 'in_progress' | 'in_review' | 'done'
  user_id: string
  labels?: string[] 
  progress?: number 
}
const COLUMNS = [
  { id: 'todo', title: 'To Do'},
  { id: 'in_progress', title: 'In Progress'},
  { id: 'in_review', title: 'In Review'},
  { id: 'done', title: 'Done'},
]

const getRelativeTime = (dateString: string) => {
  const due = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const absDays = Math.abs(diffDays)
  
  if (diffDays === 0) return "Today"
  
  const isFuture = diffDays > 0
  let timeStr = ""
  
  if (absDays < 7) {
    timeStr = `${absDays} day${absDays > 1 ? 's' : ''}`
  } else if (absDays < 30) {
    const weeks = Math.floor(absDays / 7)
    timeStr = `${weeks} week${weeks > 1 ? 's' : ''}`
  } else {
    const months = Math.floor(absDays / 30)
    timeStr = `${months} month${months > 1 ? 's' : ''}`
  }
  
  return isFuture ? `in ${timeStr}` : `${timeStr} ago`
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Modal & Expandable UI State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  
  // Expanded Form State
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  
  // Phase 1: Advanced Features State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  // Default calming landscape background from Unsplash (Lago di Braies)
  const [bgImage, setBgImage] = useState('https://unsplash.com/photos/9oaAOwjAM48/download?w=2000')

  //Labels 
  const [newTaskLabels, setNewTaskLabels] = useState<string[]>([]) 
  const [newLabelInput, setNewLabelInput] = useState('')
  const [editLabelInput, setEditLabelInput] = useState('')
  const [filterLabel, setFilterLabel] = useState('')

  useEffect(() => {
    const initializeGuestSession = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
        if(authError) throw authError
        if(authData.user) {
          setUserId(authData.user.id)
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

  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if(!newTaskTitle.trim() || !userId) return
    
    const {data, error } = await supabase
      .from('tasks')
      .insert([
        {
          title: newTaskTitle,
          description: newTaskDesc,
          priority: newTaskPriority,
          due_date: newTaskDueDate || null,
          labels: newTaskLabels,
          status: 'todo',
          user_id: userId,
        }
      ])
      .select() 

    if (error) {
      console.error('Error adding task:', error)
    } else if (data){
      setTasks([...tasks, data[0]])
      setNewTaskTitle('')
      setNewTaskDesc('')
      setNewTaskPriority('normal')
      setNewTaskDueDate('')
      setNewTaskLabels([])
      setIsCreateModalOpen(false) // Close the modal on success
    }
  }

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
        labels: editingTask.labels,
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

  const handleProgressUpdate = async (task: Task, newProgress: number) => {
    // Optimistic UI update for snappy feel
    setTasks(tasks.map(t => t.id === task.id ? { ...t, progress: newProgress } : t))
    
    // Background database update
    const { error } = await supabase
      .from('tasks')
      .update({ progress: newProgress })
      .eq('id', task.id)
      
    if (error) console.error("Error updating progress:", error)
  }

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if(!destination) return
    if(destination.droppableId === source.droppableId) return

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const imageUrl = URL.createObjectURL(file)
      setBgImage(imageUrl)
    }
  }

  // --- Stats Calculations ---
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'done').length
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false
    const due = new Date(t.due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return due < today
  }).length

  // --- Filtering Logic ---
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    
    // Check if the task has labels and if it matches the filter
    const matchesLabel = filterLabel === '' || (task.labels && task.labels.some(l => l.toLowerCase().includes(filterLabel.toLowerCase())))
    
    return matchesSearch && matchesPriority && matchesLabel
  })

  const isFilterActive = searchQuery !== '' || filterPriority !== 'all' || filterLabel !== ''

  if(isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-800 font-medium">Loading board...</div>
  }

  return (
    <div 
      className="min-h-screen p-8 text-gray-900 transition-all duration-500 relative"
      style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
    >
      {/* Semi-transparent overlay to ensure readability */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] pointer-events-none z-0"></div>
      
      {/* Content wrapper ensuring z-index stays above overlay */}
      <div className="relative z-10 max-w-[1400px] mx-auto">
        <header className="mb-8 relative z-50">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 drop-shadow-sm">Kanban Board</h1>
            
            {/* Board Stats */}
            <div className="flex gap-4 bg-white/70 backdrop-blur-md px-6 py-2 rounded-xl shadow-sm border border-white/50">
              <div className="text-center"><p className="text-xs text-gray-500 font-bold uppercase">Total</p><p className="font-semibold text-lg">{totalTasks}</p></div>
              <div className="w-px bg-gray-300"></div>
              <div className="text-center"><p className="text-xs text-gray-500 font-bold uppercase">Done</p><p className="font-semibold text-lg text-green-600">{completedTasks}</p></div>
              <div className="w-px bg-gray-300"></div>
              <div className="text-center"><p className="text-xs text-gray-500 font-bold uppercase">Overdue</p><p className="font-semibold text-lg text-red-600">{overdueTasks}</p></div>
            </div>
          </div>

          {/* Action Bar: Replaces the exposed forms and inputs */}
          <div className="flex justify-between items-center bg-white/40 backdrop-blur-md p-4 rounded-xl border border-white/50 shadow-sm mb-6">
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 font-medium transition-colors shadow-md flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              New Task
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm border flex items-center gap-2 ${isFilterExpanded ? 'bg-gray-100 border-gray-300' : 'bg-white/80 border-gray-200 hover:bg-white'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                Filter Tasks
                {isFilterActive && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 ml-1"></span>
                )}
              </button>

              {/* Expandable Filter Dropdown */}
              {isFilterExpanded && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-xl p-4 rounded-xl shadow-xl border border-gray-200 flex flex-col gap-3 z-30">
                  <input 
                    type="text" 
                    placeholder="🔍 Search tasks..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                  />

                  <input 
                    type="text" 
                    placeholder="🏷️ Filter by label..." 
                    value={filterLabel}
                    onChange={(e) => setFilterLabel(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                  />
                  
                  <select 
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High Priority</option>
                    <option value="normal">Normal Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </header>
      
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 overflow-x-auto pb-8 min-h-[65vh]">
              {COLUMNS.map((col) => {
                const columnTasks = filteredTasks.filter(task => task.status === col.id)

                return (          
                <div
                  key={col.id}
                  className="relative z-0 flex-shrink-0 w-80 min-h-[60vh] bg-white/40 border border-white/60 shadow-lg rounded-xl p-4 flex flex-col h-full" 
                >
                  <div className="absolute inset-0 backdrop-blur-md rounded-xl -z-10 pointer-events-none"></div>

                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-800">{col.title}</h2>
                    <span className="bg-white/60 text-gray-800 shadow-sm text-xs font-bold px-2.5 py-1 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 min-h-[200px] flex flex-col gap-3">
                      {columnTasks.map((task, index) => {
                        
                        const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0))
                        
                        return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>  
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white/95 p-4 rounded-lg shadow-sm border hover:shadow-md transition-all group ${isOverdue ? 'border-red-300' : 'border-white'}`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                                
                                <div className="flex items-center gap-2">
                                  {task.priority && (
                                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${
                                      task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                      task.priority === 'low' ? 'bg-green-100 text-green-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {task.priority}
                                    </span>
                                  )}
                                  <button onClick={() => setEditingTask(task)} className="text-xs text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100">
                                    Edit
                                  </button>
                                </div>
                              </div>

                              {/* Label Display */}
                              {task.labels && task.labels.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {task.labels.map((label, i) => (
                                    <span key={i} className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-md font-medium">
                                      {label}
                                    </span>
                                  ))}
                                </div>
                              )}
                              
                              {task.description && (
                                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>
                              )}
                              
                              {/* Progress Bar */}
                              <div className="mt-3 mb-1 group/slider">
                                <div className="flex justify-between text-[10px] text-gray-400 font-medium mb-1 opacity-0 group-hover/slider:opacity-100 transition-opacity">
                                  <span>Progress</span>
                                  <span>{task.progress || 0}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={task.progress || 0}
                                  onChange={(e) => handleProgressUpdate(task, parseInt(e.target.value))}
                                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer transition-colors"
                                  style={{ 
                                    accentColor: (!task.progress || task.progress === 0) 
                                      ? '#9ca3af' // Grey at 0%
                                      : `hsl(${210 - (task.progress * 0.6)}, 80%, 45%)`, // Blue (210) to Mint (150)
                                    backgroundColor: (!task.progress || task.progress === 0)
                                      ? '#e5e7eb' 
                                      : `hsl(${210 - (task.progress * 0.6)}, 80%, 85%)` // Matching pastel track
                                  }}
                                />
                              </div>
                              
                              {/* Advanced Relative Due Date */}
                              {task.due_date && (
                                <div className={`flex justify-between items-center text-xs font-medium mt-3 pt-2 border-t border-gray-100 ${isOverdue ? 'text-red-600' : 'text-gray-400'}`}>
                                  <span>{isOverdue ? '⚠️ Overdue' : '📅 Due'}</span>
                                  <span>{new Date(task.due_date).toLocaleDateString()} ({getRelativeTime(task.due_date)})</span>
                                </div>
                              )}
                            </div>
                         )}
                        </Draggable>
                        )
                      })}
                      
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
              )  
              })}
          </div>
        </DragDropContext>
      </div>

      {/* --- CREATE TASK MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-[500px] max-w-[90%]">
            <h2 className="text-xl font-bold mb-4">Create New Task</h2>
            
            <form onSubmit={handleAddTask} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Task title (required)"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required 
              />
              
              <div className="flex gap-4">
                <select 
                  value={newTaskPriority} 
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                </select>
                
                <input 
                  type="date" 
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/*Label selector*/}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a label..."
                    value={newLabelInput}
                    onChange={(e) => setNewLabelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (newLabelInput.trim() && !newTaskLabels.includes(newLabelInput.trim())) {
                          setNewTaskLabels([...newTaskLabels, newLabelInput.trim()])
                        }
                        setNewLabelInput('')
                      }
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      if (newLabelInput.trim() && !newTaskLabels.includes(newLabelInput.trim())) {
                        setNewTaskLabels([...newTaskLabels, newLabelInput.trim()])
                      }
                      setNewLabelInput('')
                    }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
                
                {/* Render Label Pills */}
                {newTaskLabels.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newTaskLabels.map(label => (
                      <span key={label} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md flex items-center gap-1 font-medium border border-blue-200">
                        {label}
                        <button type="button" onClick={() => setNewTaskLabels(newTaskLabels.filter(l => l !== label))} className="text-blue-500 hover:text-blue-800 ml-1">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                placeholder="Add a description..."
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
              />
              
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 font-medium transition-colors"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT TASK MODAL --- */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-[500px] max-w-[90%]">
            <h2 className="text-xl font-bold mb-4">Edit Task</h2>
            
            <form onSubmit={handleUpdateTask} className="flex flex-col gap-4">
              <input
                type="text"
                value={editingTask.title}
                onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required 
              />
              
              <div className="flex gap-4">
                <select 
                  value={editingTask.priority || 'normal'} 
                  onChange={(e) => setEditingTask({...editingTask, priority: e.target.value as any})}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                </select>
                
                <input 
                  type="date" 
                  value={editingTask.due_date || ''}
                  onChange={(e) => setEditingTask({...editingTask, due_date: e.target.value})}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

                {/*  Label Input with Pills for Editing */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a label..."
                    value={editLabelInput}
                    onChange={(e) => setEditLabelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (editLabelInput.trim()) {
                          const currentLabels = editingTask.labels || []
                          if (!currentLabels.includes(editLabelInput.trim())) {
                            setEditingTask({ ...editingTask, labels: [...currentLabels, editLabelInput.trim()] })
                          }
                        }
                        setEditLabelInput('')
                      }
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      if (editLabelInput.trim()) {
                        const currentLabels = editingTask.labels || []
                        if (!currentLabels.includes(editLabelInput.trim())) {
                          setEditingTask({ ...editingTask, labels: [...currentLabels, editLabelInput.trim()] })
                        }
                      }
                      setEditLabelInput('')
                    }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
                
                {/* Render Label Pills */}
                {editingTask.labels && editingTask.labels.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editingTask.labels.map(label => (
                      <span key={label} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md flex items-center gap-1 font-medium border border-blue-200">
                        {label}
                        <button type="button" onClick={() => setEditingTask({...editingTask, labels: editingTask.labels!.filter(l => l !== label)})} className="text-blue-500 hover:text-blue-800 ml-1">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <textarea
                value={editingTask.description || ''}
                placeholder='Description'
                onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
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

      {/* Background Image Uploader (Bottom Right) - Reduced Size */}
      <label className="fixed bottom-4 right-4 bg-white/80 backdrop-blur-sm p-2.5 rounded-full shadow-md border border-gray-200 cursor-pointer hover:bg-white transition-all hover:scale-105 z-40 group">
        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700 group-hover:text-blue-600">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          <path d="m15 5 4 4"/>
        </svg>
      </label>
    </div>
  )
}