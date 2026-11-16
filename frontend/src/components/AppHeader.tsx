import React from 'react'
import { UserProfile } from '../types/anime'
import { NavigationTabs, TabKey } from './header/NavigationTabs'
import { SearchBar } from './header/SearchBar'
import { UserMenu } from './header/UserMenu'

export type { TabKey }

export interface AppHeaderProps {
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void
  theme: string
  setTheme: (t: string) => void
  userProfile: UserProfile | null
  onOpenAnime: (id: number) => void
  onOpenStats: () => void
  onOpenSettings: () => void
  onOpenAbout: () => void
  onOpenRatesWithType: (type: 'Anime' | 'Manga') => void
}

export function AppHeader({
  activeTab,
  setActiveTab,
  theme,
  setTheme,
  userProfile,
  onOpenAnime,
  onOpenStats,
  onOpenSettings,
  onOpenAbout,
  onOpenRatesWithType,
}: AppHeaderProps) {
  return (
    <header
      className="app-header-mx2"
      style={{
        height: 'var(--header-height, 56px)',
        padding: '0 var(--page-gutter, 24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--modal-border)',
        backdropFilter: 'blur(20px)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        boxSizing: 'border-box',
        zIndex: 100,
      }}
    >
      <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <SearchBar onOpenAnime={onOpenAnime} />
      <UserMenu
        userProfile={userProfile}
        theme={theme}
        setTheme={setTheme}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenStats={onOpenStats}
        onOpenSettings={onOpenSettings}
        onOpenAbout={onOpenAbout}
        onOpenRatesWithType={onOpenRatesWithType}
      />
    </header>
  )
}
