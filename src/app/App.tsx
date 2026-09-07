import { useState } from 'react'
import { MainRail } from '../components/MainRail'
import { SectionSidebar } from '../components/SectionSidebar'
import { ContextSidebar } from '../components/ContextSidebar'
import { HomePreview } from '../components/HomePreview'
import { UserPanel } from '../components/UserPanel'

export function App() {
  const [active, setActive] = useState('home')

  return (
    <div className="app-shell">
      <MainRail active={active} onSelect={setActive} />
      <div className="sidebar-column">
        <SectionSidebar active={active} />
        <UserPanel />
      </div>
      <HomePreview />
      <ContextSidebar />
    </div>
  )
}
