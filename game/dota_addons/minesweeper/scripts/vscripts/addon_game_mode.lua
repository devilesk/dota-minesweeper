require("libraries/util")
require("libraries/timers")
require("debugf")

local DEBUG = 0

function toboolbit(value)
    if value and value ~= "0" and value ~= 0 then
        return 1
    else
        return 0
    end
end

if GameMode == nil then
    GameMode = class({})
end

function Precache(context)
    PrecacheResource( "soundfile", "soundevents/game_sounds_heroes/game_sounds_techies.vsndevts", context )
end

-- Create the game mode when we activate
function Activate()
    GameRules.AddonTemplate = GameMode()
    GameRules.AddonTemplate:InitGameMode()
end

function GameMode:OnNPCSpawned(event)
    DebugPrint("OnNPCSpawned", event)
    local npc = EntIndexToHScript(event.entindex)
    if npc:IsRealHero() then
        npc:RemoveSelf()
        PlayerResource:SetCameraTarget(npc:GetPlayerID(), Entities:FindByClassname(nil, "worldent"))
    end
end

function GameMode:OnGameRulesStateChange()
    local nNewState = GameRules:State_Get()
        DebugPrint("OnGameRulesStateChange", nNewState)
    if nNewState == DOTA_GAMERULES_STATE_INIT then
        DebugPrint("DOTA_GAMERULES_STATE_INIT")
    elseif nNewState == DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD then
        DebugPrint("DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD")
    elseif nNewState == DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP then
        DebugPrint("DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP")
        PlayerResource:SetCustomTeamAssignment( 0, DOTA_TEAM_GOODGUYS )
        GameRules:FinishCustomGameSetup()
    elseif nNewState == DOTA_GAMERULES_STATE_HERO_SELECTION then
        DebugPrint("DOTA_GAMERULES_STATE_HERO_SELECTION")
    elseif nNewState == DOTA_GAMERULES_STATE_PRE_GAME then
        DebugPrint("DOTA_GAMERULES_STATE_PRE_GAME")
    elseif nNewState == DOTA_GAMERULES_STATE_GAME_IN_PROGRESS then
        DebugPrint("DOTA_GAMERULES_STATE_GAME_IN_PROGRESS")
    end
end

function GameMode:InitGameMode()
    if IsInToolsMode()	then
        DEBUG = 1
    end
    
    DebugPrint("InitGameMode")

    GameRules:GetGameModeEntity():SetAnnouncerDisabled(true)
    
    ListenToGameEvent("npc_spawned", Dynamic_Wrap(GameMode, "OnNPCSpawned"), self)
    ListenToGameEvent("game_rules_state_change", Dynamic_Wrap(GameMode, "OnGameRulesStateChange"), self)
    
    GameRules:SetCustomGameTeamMaxPlayers( DOTA_TEAM_GOODGUYS, 1 )
    GameRules:SetCustomGameTeamMaxPlayers( DOTA_TEAM_BADGUYS, 0 )

    CustomNetTables:SetTableValue("debug", "log", {value=DEBUG})
    Convars:RegisterCommand("minesweeper_debug", Dynamic_Wrap(GameMode, "OnSetDebug"), "Set to 1 to turn on debug output. Set to 0 to disable.", 0)
    
    GameRules:GetGameModeEntity():SetThink( "OnSetTimeOfDayThink", self, "SetTimeOfDay", 2 )
end

function GameMode:OnSetTimeOfDayThink()
    GameRules:SetTimeOfDay(.5)
    return 10
end

function GameMode:OnSetDebug(value)
    if Convars:GetDOTACommandClient() then
        DebugPrint("Setting debug", value)
        CustomNetTables:SetTableValue("debug", "log", {value=toboolbit(value)})
    end
end