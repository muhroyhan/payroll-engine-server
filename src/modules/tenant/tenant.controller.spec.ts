import { Test, TestingModule } from '@nestjs/testing'
import { TenantController } from './controllers'
import { TenantService } from './services'

describe('TenantController', () => {
  let controller: TenantController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantController],
      providers: [TenantService],
    }).compile()

    controller = module.get<TenantController>(TenantController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
