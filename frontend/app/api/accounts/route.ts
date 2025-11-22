import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { ExecOptions } from 'child_process'

const execAsync = promisify(exec) as (command: string, options?: ExecOptions) => Promise<{ stdout: string; stderr: string }>

// Path to account manager script
// In Next.js, process.cwd() is the project root (frontend directory)
// So we need to go up one level to reach the backend directory
const BACKEND_DIR = path.resolve(process.cwd(), '..', 'backend')
const ACCOUNT_MANAGER_CLI = path.resolve(BACKEND_DIR, 'account_manager_cli.py')

interface Account {
  id: string
  name: string
  enabled: boolean
  created_at?: string
  updated_at?: string
}

// Helper function to run Python CLI command
async function runAccountManagerCommand(args: string[]): Promise<any> {
  // Escape arguments properly for Windows command line
  const escapeArg = (arg: string): string => {
    // If arg contains spaces or special chars, wrap in quotes and escape internal quotes
    if (arg.includes(' ') || arg.includes('"') || arg.includes('&') || arg.includes('|')) {
      return `"${arg.replace(/"/g, '\\"')}"`
    }
    return arg
  }
  
  const escapedArgs = args.map(escapeArg).join(' ')
  const command = `conda run -n trader-env python "${ACCOUNT_MANAGER_CLI}" ${escapedArgs}`
  
  const { stdout, stderr } = await execAsync(command, { 
    cwd: BACKEND_DIR,
    shell: true as any,
    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
  } as ExecOptions)

  if (stderr && !stderr.includes('WARNING') && !stderr.trim().includes('Pydantic')) {
    console.error('Python stderr:', stderr)
  }

  const output = stdout.trim()
  if (!output) {
    throw new Error('No output from command')
  }

  try {
    return JSON.parse(output)
  } catch (e) {
    console.error('Failed to parse JSON:', output)
    throw new Error(`Failed to parse output: ${output.substring(0, 200)}`)
  }
}

// GET /api/accounts - Get all accounts
export async function GET() {
  try {
    const result = await runAccountManagerCommand(['list'])
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch accounts')
    }

    return NextResponse.json({ accounts: result.accounts || [] })
  } catch (error: any) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/accounts - Add new account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { account_id, name } = body

    if (!account_id) {
      return NextResponse.json(
        { error: 'account_id is required' },
        { status: 400 }
      )
    }

    // Validate account ID first
    try {
      const validation = await runAccountManagerCommand(['validate', account_id])
      if (!validation.valid || validation.exists) {
        return NextResponse.json(
          { error: validation.error || 'Invalid account ID or account already exists' },
          { status: 400 }
        )
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Account validation failed', details: error.message },
        { status: 400 }
      )
    }

    // Add account
    const args = ['add', account_id]
    if (name) {
      args.push('--name', name)
    }
    
    const result = await runAccountManagerCommand(args)
    
    if (result.success) {
      // Data fetch is automatically triggered by the CLI when adding account
      return NextResponse.json({ 
        account: result.account,
        data_fetch_triggered: result.data_fetch_triggered || false
      }, { status: 201 })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to add account' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error adding account:', error)
    return NextResponse.json(
      { error: 'Failed to add account', details: error.message },
      { status: 500 }
    )
  }
}

