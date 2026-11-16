import React, { useState } from 'react'
import { TabKey } from '../header/NavigationTabs'
import { MobileNavSheet } from './MobileNavSheet'

interface BottomNavProps {
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void
  onOpenSettings?: () => void
  onOpenAbout?: () => void
  onOpenStats?: () => void
}

export function BottomNav({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onOpenAbout,
  onOpenStats,
}: BottomNavProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const isMain = activeTab === 'profile'
  const isCatalog = activeTab === 'catalog-anime' || activeTab === 'top100' || activeTab === 'catalog-manga' || activeTab === 'catalog-ranobe'
  const isRates = activeTab === 'rates' || activeTab === 'favourites' || activeTab === 'history'
  const isCommunity = activeTab === 'forum' || activeTab === 'clubs' || activeTab === 'collections' || activeTab === 'critiques' || activeTab === 'articles' || activeTab === 'users'

  return (
    <>
      <nav
        className="mobile-bottom-nav"
        aria-label="Мобильная навигация"
      >
        {/* 1. Главная */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`bottom-nav-item ${isMain ? 'is-active' : ''}`}
          aria-label="Главная страница"
          aria-current={isMain ? 'page' : undefined}
        >
          <i className="ti ti-home" />
          <span>Главная</span>
        </button>

        {/* 2. Каталог */}
        <button
          onClick={() => setActiveTab('catalog-anime')}
          className={`bottom-nav-item ${isCatalog ? 'is-active' : ''}`}
          aria-label="Каталог аниме и манги"
          aria-current={isCatalog ? 'page' : undefined}
        >
          <i className="ti ti-player-play" />
          <span>Каталог</span>
        </button>

        {/* 3. Списки */}
        <button
          onClick={() => setActiveTab('rates')}
          className={`bottom-nav-item ${isRates ? 'is-active' : ''}`}
          aria-label="Списки — персональные списки"
          aria-current={isRates ? 'page' : undefined}
        >
          <i className="ti ti-list-check" />
          <span>Списки</span>
        </button>

        {/* 4. Сообщество */}
        <button
          onClick={() => setActiveTab('forum')}
          className={`bottom-nav-item ${isCommunity ? 'is-active' : ''}`}
          aria-label="Форум — темы и сообщество"
          aria-current={isCommunity ? 'page' : undefined}
        >
          <i className="ti ti-messages" />
          <span>Форум</span>
        </button>

        {/* 5. Ещё / Все разделы */}
        <button
          onClick={() => setSheetOpen(true)}
          className={`bottom-nav-item ${sheetOpen ? 'is-active' : ''}`}
          aria-label="Ещё — все разделы сайта"
          aria-expanded={sheetOpen}
        >
          <i className="ti ti-grid-dots" />
          <span>Ещё</span>
        </button>
      </nav>

      {/* Fullscreen category sheet */}
      <MobileNavSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab)
          setSheetOpen(false)
        }}
        onOpenSettings={onOpenSettings}
        onOpenAbout={onOpenAbout}
        onOpenStats={onOpenStats}
      />
    </>
  )
}
