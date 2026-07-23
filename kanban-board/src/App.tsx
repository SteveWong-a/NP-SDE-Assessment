import { useState } from 'react'

const COLUMNS = [
  { id: 'todo', title: 'To Do'},
  { id: 'in_progress', title: 'In Progress'},
  { id: 'in_review', title: 'In Review'},
  { id: 'done', title: 'done'},
]

//Kanban Dashboard 
export default function App() {
  return (
    <div className = "min-h-screen bg-gray-100 p-8 text-gray-900">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Kanban Board</h1>
        </header>
    
    <div className="flex gap-6 overflow-x-auto pb-4">

        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="flex-shrink-0 w-80 bg-gray-200/50 rounded-l p-4 flex flex-col"
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