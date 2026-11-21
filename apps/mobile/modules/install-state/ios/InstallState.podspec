Pod::Spec.new do |s|
  s.name           = 'InstallState'
  s.version        = '0.1.0'
  s.summary        = 'Lost & Found app installation state'
  s.description    = s.summary
  s.license        = { :type => 'UNLICENSED' }
  s.author         = 'Lost & Found'
  s.homepage       = 'https://example.invalid'
  s.platforms      = { :ios => '16.4' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files   = '**/*.swift'
end
