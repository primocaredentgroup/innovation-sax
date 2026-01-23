import { mutation } from './_generated/server'
import { v } from 'convex/values'

/**
 * Popola il database con dati di esempio per sviluppo e test.
 * ATTENZIONE: Questa funzione elimina tutti i dati esistenti e li sostituisce con seed-data.
 * Usare solo in ambiente di sviluppo.
 */
export const seedDatabase = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Verifica che l'utente sia autenticato (opzionale, puoi rimuovere se vuoi)
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Devi essere autenticato per eseguire il seed')
    }

    // Elimina tutti i dati esistenti (opzionale - commenta se vuoi mantenere i dati esistenti)
    // Nota: Convex non supporta delete multipli facilmente, quindi creiamo solo nuovi dati
    // Se vuoi pulire, fallo manualmente dal dashboard

    // 1. Crea Categorie
    const categoriaFrontend = await ctx.db.insert('categories', {
      name: 'Frontend'
    })
    const categoriaBackend = await ctx.db.insert('categories', {
      name: 'Backend'
    })
    const categoriaMobile = await ctx.db.insert('categories', {
      name: 'Mobile'
    })
    const categoriaDevOps = await ctx.db.insert('categories', {
      name: 'DevOps'
    })
    const categoriaData = await ctx.db.insert('categories', {
      name: 'Data & Analytics'
    })

    // 2. Crea Dipartimenti (con categorie associate)
    const deptEngineering = await ctx.db.insert('departments', {
      name: 'Engineering',
      categoryIds: [categoriaFrontend, categoriaBackend, categoriaMobile]
    })
    const deptInfrastructure = await ctx.db.insert('departments', {
      name: 'Infrastructure',
      categoryIds: [categoriaDevOps, categoriaBackend]
    })
    const deptData = await ctx.db.insert('departments', {
      name: 'Data & Analytics',
      categoryIds: [categoriaData, categoriaBackend]
    })
    const deptProduct = await ctx.db.insert('departments', {
      name: 'Product',
      categoryIds: [categoriaFrontend, categoriaMobile]
    })

    // 3. Ottieni l'utente corrente per creare KeyDevs
    // Nota: Gli utenti vengono creati automaticamente al login tramite Auth0
    // Qui usiamo l'utente corrente per creare i KeyDevs di esempio
    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!currentUser) {
      throw new Error('Utente corrente non trovato. Assicurati di essere loggato.')
    }

    // 4. Crea Mesi con budget
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1

    for (let i = 0; i < 6; i++) {
      const month = currentMonth + i
      const year = currentYear + Math.floor((month - 1) / 12)
      const monthRef = `${year}-${String(((month - 1) % 12) + 1).padStart(2, '0')}`
      
      await ctx.db.insert('months', {
        monthRef,
        totalKeyDev: 20 + Math.floor(Math.random() * 10) // Budget tra 20 e 30
      })
    }

    // 5. Crea Budget allocations per il mese corrente
    const currentMonthRef = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    
    // Engineering - Frontend: 5 KeyDev
    await ctx.db.insert('budgetKeyDev', {
      monthRef: currentMonthRef,
      deptId: deptEngineering,
      categoryId: categoriaFrontend,
      maxAlloc: 5
    })
    
    // Engineering - Backend: 4 KeyDev
    await ctx.db.insert('budgetKeyDev', {
      monthRef: currentMonthRef,
      deptId: deptEngineering,
      categoryId: categoriaBackend,
      maxAlloc: 4
    })
    
    // Engineering - Mobile: 3 KeyDev
    await ctx.db.insert('budgetKeyDev', {
      monthRef: currentMonthRef,
      deptId: deptEngineering,
      categoryId: categoriaMobile,
      maxAlloc: 3
    })
    
    // Infrastructure - DevOps: 4 KeyDev
    await ctx.db.insert('budgetKeyDev', {
      monthRef: currentMonthRef,
      deptId: deptInfrastructure,
      categoryId: categoriaDevOps,
      maxAlloc: 4
    })
    
    // Infrastructure - Backend: 2 KeyDev
    await ctx.db.insert('budgetKeyDev', {
      monthRef: currentMonthRef,
      deptId: deptInfrastructure,
      categoryId: categoriaBackend,
      maxAlloc: 2
    })
    
    // Data & Analytics - Data: 3 KeyDev
    await ctx.db.insert('budgetKeyDev', {
      monthRef: currentMonthRef,
      deptId: deptData,
      categoryId: categoriaData,
      maxAlloc: 3
    })
    
    // Product - Frontend: 3 KeyDev
    await ctx.db.insert('budgetKeyDev', {
      monthRef: currentMonthRef,
      deptId: deptProduct,
      categoryId: categoriaFrontend,
      maxAlloc: 3
    })

    // 6. Crea alcuni KeyDevs di esempio (usando l'utente corrente come requester)
    await ctx.db.insert('keydevs', {
      title: 'Nuovo sistema di autenticazione',
      desc: 'Implementare un nuovo sistema di autenticazione con supporto OAuth2 e MFA',
      monthRef: currentMonthRef,
      categoryId: categoriaBackend,
      deptId: deptEngineering,
      requesterId: currentUser._id,
      status: 'Draft'
    })

    await ctx.db.insert('keydevs', {
      title: 'Dashboard analytics migliorata',
      desc: 'Creare una nuova dashboard con grafici interattivi e filtri avanzati',
      monthRef: currentMonthRef,
      categoryId: categoriaFrontend,
      deptId: deptProduct,
      requesterId: currentUser._id,
      status: 'MockupDone',
      mockupRepoUrl: 'https://github.com/example/dashboard-mockup'
    })

    await ctx.db.insert('keydevs', {
      title: 'App mobile iOS',
      desc: 'Sviluppare la versione iOS dell\'applicazione mobile',
      monthRef: currentMonthRef,
      categoryId: categoriaMobile,
      deptId: deptEngineering,
      requesterId: currentUser._id,
      status: 'Approved',
      approvedAt: Date.now() - 86400000, // 1 giorno fa
      techValidatorId: currentUser._id, // TechValidator approva il mockup
      mockupRepoUrl: 'https://github.com/example/ios-mockup'
    })

    await ctx.db.insert('keydevs', {
      title: 'Pipeline CI/CD automatizzata',
      desc: 'Configurare una pipeline CI/CD completa con test automatici e deploy',
      monthRef: currentMonthRef,
      categoryId: categoriaDevOps,
      deptId: deptInfrastructure,
      requesterId: currentUser._id,
      status: 'InProgress',
      donePerc: 45,
      ownerId: currentUser._id, // Owner che sta sviluppando
      mockupRepoUrl: 'https://github.com/example/cicd-mockup'
    })

    await ctx.db.insert('keydevs', {
      title: 'Sistema di reporting avanzato',
      desc: 'Implementare un sistema di reporting con machine learning per previsioni',
      monthRef: currentMonthRef,
      categoryId: categoriaData,
      deptId: deptData,
      requesterId: currentUser._id,
      status: 'FrontValidated',
      frontValidatedAt: Date.now() - 43200000, // 12 ore fa
      businessValidatorId: currentUser._id, // BusinessValidator valida il front
      mockupRepoUrl: 'https://github.com/example/reporting-mockup'
    })

    // 7. Crea alcune Core Apps
    await ctx.db.insert('coreApps', {
      name: 'Planner App',
      description: 'Applicazione principale per la pianificazione dei KeyDev',
      percentComplete: 75,
      status: 'InProgress',
      repoUrl: 'https://github.com/example/planner-app'
    })

    await ctx.db.insert('coreApps', {
      name: 'Analytics Platform',
      description: 'Piattaforma di analytics e reporting',
      percentComplete: 30,
      status: 'InProgress',
      repoUrl: 'https://github.com/example/analytics-platform'
    })

    await ctx.db.insert('coreApps', {
      name: 'Mobile SDK',
      description: 'SDK per lo sviluppo di app mobile',
      percentComplete: 100,
      status: 'Completed',
      repoUrl: 'https://github.com/example/mobile-sdk'
    })

    return null
  }
})
